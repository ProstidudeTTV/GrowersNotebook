"use client";

import * as MatrixCryptoWasm from "@matrix-org/matrix-sdk-crypto-wasm";
import { apiFetch } from "@/lib/api-public";
import { peerMxidForProfileId } from "@/lib/matrix-mxid";
import { createClient } from "@/lib/supabase/client";
import {
  ClientEvent,
  createClient as createMatrixClient,
  EventType,
  KnownMembership,
  MatrixEventEvent,
  MsgType,
  Preset,
  type MatrixClient,
  type MatrixEvent,
  type Room,
  RoomEvent,
  SyncState,
} from "matrix-js-sdk";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type LoginBundle = {
  homeserverUrl: string;
  userId: string;
  jwt: string;
  expiresIn: number;
};

const CREATE_ROOM_TIMEOUT_MS = 90_000;

function pickThreadRoot(client: MatrixClient, ev: MatrixEvent): MatrixEvent {
  const relates = ev.getContent()?.["m.relates_to"] as
    | { rel_type?: string; event_id?: string }
    | undefined;
  if (relates?.rel_type === "m.thread" && relates.event_id) {
    const room = client.getRoom(ev.getRoomId() ?? "");
    const found = room?.findEventById(relates.event_id);
    if (found) return found;
  }
  return ev;
}

function eventBody(ev: MatrixEvent): string {
  const c = ev.getContent();
  if (c?.body && typeof c.body === "string") return c.body;
  if (c?.msgtype === MsgType.Text && typeof c.body === "string") return c.body;
  return "";
}

function directRoomIds(client: MatrixClient): Set<string> {
  const ev = client.getAccountData(EventType.Direct);
  const content = ev?.getContent() as Record<string, string[] | undefined> | undefined;
  const ids = new Set<string>();
  if (content && typeof content === "object") {
    for (const rooms of Object.values(content)) {
      if (!Array.isArray(rooms)) continue;
      for (const id of rooms) {
        if (typeof id === "string") ids.add(id);
      }
    }
  }
  return ids;
}

function listDmRooms(client: MatrixClient): Room[] {
  const direct = directRoomIds(client);
  const rooms = client.getRooms().filter((r) => r.getMyMembership() === "join");
  return rooms.filter((r) => {
    if (direct.size > 0 && direct.has(r.roomId)) return true;
    const joined = r.getJoinedMemberCount();
    const invited = r.getInvitedMemberCount();
    if (joined === 2) return true;
    // DM we created while the other person is still invited (not joined yet)
    if (joined === 1 && invited >= 1) return true;
    return false;
  });
}

function roomLastTs(r: Room): number {
  const evs = r.getLiveTimeline().getEvents();
  const last = evs[evs.length - 1];
  return last?.getTs() ?? 0;
}

function dmLabel(client: MatrixClient, room: Room): string {
  const me = client.getUserId();
  if (!me) return room.name || room.roomId;
  const others = room.getJoinedMembers().filter((m) => m.userId !== me);
  if (others.length === 1) {
    const m = others[0]!;
    const raw =
      m.name || m.rawDisplayName || m.userId.split(":")[0]?.replace("@", "");
    return raw || "Chat";
  }
  const pending = room
    .getMembersWithMembership(KnownMembership.Invite)
    .filter((m) => m.userId !== me);
  if (pending.length >= 1) {
    const m = pending[0]!;
    const raw =
      m.name || m.rawDisplayName || m.userId.split(":")[0]?.replace("@", "");
    return raw ? `${raw} (pending)` : "Pending invite";
  }
  return room.name || room.getCanonicalAlias() || "Chat";
}

function findDmWithPeer(client: MatrixClient, peerMxid: string): Room | null {
  const me = client.getUserId();
  if (!me) return null;
  for (const r of listDmRooms(client)) {
    const ids = new Set([
      ...r.getJoinedMembers().map((m) => m.userId),
      ...r
        .getMembersWithMembership(KnownMembership.Invite)
        .map((m) => m.userId),
    ]);
    if (ids.has(peerMxid) && ids.has(me)) return r;
  }
  return null;
}

export function MessagesPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const withParam = searchParams.get("with");

  const [status, setStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [cryptoReady, setCryptoReady] = useState(false);
  const [client, setClient] = useState<MatrixClient | null>(null);
  const [conversations, setConversations] = useState<
    { id: string; label: string; ts: number }[]
  >([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [lines, setLines] = useState<
    { id: string; sender: string; body: string }[]
  >([]);
  const [draft, setDraft] = useState("");
  const [busyPeer, setBusyPeer] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const openedForWith = useRef<string | null>(null);

  const refreshConversations = useCallback((c: MatrixClient) => {
    const list = listDmRooms(c)
      .map((r) => ({
        id: r.roomId,
        label: dmLabel(c, r),
        ts: roomLastTs(r),
      }))
      .sort((a, b) => b.ts - a.ts);
    setConversations(list);
  }, []);

  const loadTimeline = useCallback((c: MatrixClient, roomId: string) => {
    const room = c.getRoom(roomId);
    if (!room) {
      setLines([]);
      return;
    }
    const live = room.getLiveTimeline();
    const events = live.getEvents();
    const out: { id: string; sender: string; body: string }[] = [];
    for (const ev of events) {
      const t = ev.getType();
      if (t === EventType.RoomMessageEncrypted) {
        let body: string;
        if (ev.isBeingDecrypted()) body = "Decrypting…";
        else if (ev.isDecryptionFailure()) body = "Unable to decrypt this message.";
        else body = "Encrypted message…";
        out.push({
          id: ev.getId()!,
          sender: ev.getSender() ?? "?",
          body,
        });
        continue;
      }
      if (t !== EventType.RoomMessage) continue;
      if (ev.getContent()?.msgtype !== MsgType.Text) continue;
      const root = pickThreadRoot(c, ev);
      out.push({
        id: ev.getId()!,
        sender: root.getSender() ?? "?",
        body: eventBody(root),
      });
    }
    setLines(out);
  }, []);

  const openOrCreateDm = useCallback(
    async (peerProfileId: string) => {
      if (!client) return;
      setActionError(null);
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setActionError("Sign in to start a chat.");
        return;
      }
      setBusyPeer(peerProfileId);
      try {
        await apiFetch("/matrix/ensure-peer", {
          method: "POST",
          body: JSON.stringify({ peerProfileId }),
          token: session.access_token,
        });
        const me = client.getUserId();
        if (!me) {
          setActionError("Messaging session not ready.");
          return;
        }
        const peerMxid = await peerMxidForProfileId(peerProfileId, me);
        const existing = findDmWithPeer(client, peerMxid);
        if (existing) {
          setActiveRoomId(existing.roomId);
          loadTimeline(client, existing.roomId);
          refreshConversations(client);
          router.replace("/messages", { scroll: false });
          return;
        }
        const createPromise = client.createRoom({
          preset: Preset.TrustedPrivateChat,
          is_direct: true,
          invite: [peerMxid],
          initial_state: [
            {
              type: EventType.RoomEncryption,
              state_key: "",
              content: { algorithm: "m.megolm.v1.aes-sha2" },
            },
          ],
        });
        const raced = await Promise.race([
          createPromise,
          new Promise<never>((_, reject) => {
            window.setTimeout(
              () =>
                reject(
                  new Error(
                    "Creating the chat timed out. Check your connection and try again.",
                  ),
                ),
              CREATE_ROOM_TIMEOUT_MS,
            );
          }),
        ]);
        const roomId = raced.room_id;
        setActiveRoomId(roomId);
        loadTimeline(client, roomId);
        refreshConversations(client);
        router.replace("/messages", { scroll: false });
      } catch (e) {
        let msg = e instanceof Error ? e.message : String(e);
        if (/403|forbidden|only start a chat|only message people you follow/i.test(msg)) {
          msg =
            "You can only message people you follow. Follow them on their profile, then use Message.";
        }
        setActionError(msg);
        openedForWith.current = null;
      } finally {
        setBusyPeer(null);
      }
    },
    [client, loadTimeline, refreshConversations, router],
  );

  useEffect(() => {
    let mx: MatrixClient | null = null;
    let cancelled = false;
    let debounceRefresh: number | undefined;

    (async () => {
      setStatus("loading");
      setError(null);
      setCryptoReady(false);
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error("Sign in to use messages.");
        }
        const bundle = await apiFetch<LoginBundle>("/matrix/login-token", {
          method: "POST",
          body: JSON.stringify({}),
          token: session.access_token,
        });

        /**
         * Must use the same module instance as matrix-js-sdk (rust-crypto calls initAsync() with no URL).
         * Dynamic import can duplicate the package so pre-init never applies — use static import above.
         * WASM file is copied to /public/wasm/ during build (see copy-matrix-wasm.cjs).
         */
        const wasmAsset = new URL(
          "/wasm/matrix_sdk_crypto_wasm_bg.wasm",
          window.location.origin,
        );
        const wasmProbe = await fetch(wasmAsset.href, { method: "GET" });
        if (!wasmProbe.ok) {
          throw new Error(
            `Encryption module not found (${wasmProbe.status}). Try redeploying the site.`,
          );
        }
        await MatrixCryptoWasm.initAsync(wasmAsset);

        const loginUrl = `${bundle.homeserverUrl.replace(/\/+$/, "")}/_matrix/client/v3/login`;
        const loginRes = await fetch(loginUrl, {
          method: "POST",
          redirect: "manual",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            type: "org.matrix.login.jwt",
            token: bundle.jwt,
          }),
        });
        if (loginRes.status >= 300 && loginRes.status < 400) {
          const loc = loginRes.headers.get("Location") ?? "";
          throw new Error(
            `Homeserver returned redirect ${loginRes.status}${loc ? ` → ${loc}` : ""} on login. ` +
              `Set SYNAPSE_PUBLIC_BASE_URL to the exact HTTPS URL of the Synapse service (no trailing slash).`,
          );
        }
        const loginRaw = await loginRes.text();
        let loginJson: {
          access_token?: string;
          user_id?: string;
          device_id?: string;
          errcode?: string;
          error?: string;
        };
        try {
          loginJson = loginRaw ? (JSON.parse(loginRaw) as typeof loginJson) : {};
        } catch {
          throw new Error(
            `Homeserver login returned non-JSON (${loginRes.status}): ${loginRaw.slice(0, 200)}${loginRaw.length > 200 ? "…" : ""}`,
          );
        }
        if (!loginRes.ok) {
          throw new Error(
            loginJson.error ||
              loginJson.errcode ||
              `Could not sign in to messaging (${loginRes.status})`,
          );
        }
        if (
          !loginJson.access_token ||
          !loginJson.user_id ||
          !loginJson.device_id
        ) {
          throw new Error("Messaging login response missing credentials.");
        }

        mx = createMatrixClient({
          baseUrl: bundle.homeserverUrl.replace(/\/+$/, ""),
          accessToken: loginJson.access_token,
          userId: loginJson.user_id,
          deviceId: loginJson.device_id,
        });

        try {
          await mx.initRustCrypto();
        } catch (e) {
          console.error("Matrix initRustCrypto failed", e);
          const detail =
            e instanceof Error ? e.message : String(e);
          throw new Error(
            detail
              ? `Could not initialize encryption: ${detail.slice(0, 280)}`
              : "Could not initialize encryption. Try refreshing the page.",
          );
        }
        if (!cancelled) setCryptoReady(true);

        const debouncedListRefresh = () => {
          if (debounceRefresh) window.clearTimeout(debounceRefresh);
          debounceRefresh = window.setTimeout(() => {
            refreshConversations(mx!);
          }, 400);
        };

        mx.on(ClientEvent.Sync, (st) => {
          if (st === SyncState.Prepared) {
            refreshConversations(mx!);
          }
          debouncedListRefresh();
        });

        await mx.startClient();
        await new Promise<void>((resolve, reject) => {
          const t = window.setTimeout(
            () => reject(new Error("Messaging sync timed out.")),
            120_000,
          );
          const done = () => {
            window.clearTimeout(t);
            mx!.removeListener(ClientEvent.Sync, onSync);
            resolve();
          };
          const onSync = (st: SyncState) => {
            if (st === SyncState.Prepared) done();
          };
          mx!.on(ClientEvent.Sync, onSync);
          if (mx!.isInitialSyncComplete()) done();
        });

        if (cancelled) return;
        setClient(mx);
        refreshConversations(mx);
        setStatus("ready");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
        mx?.stopClient();
      }
    })();

    return () => {
      cancelled = true;
      if (debounceRefresh) window.clearTimeout(debounceRefresh);
      mx?.stopClient();
    };
  }, [refreshConversations]);

  useEffect(() => {
    if (!withParam) {
      openedForWith.current = null;
      return;
    }
    if (!client || !cryptoReady) return;
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(withParam)) return;
    if (openedForWith.current === withParam) return;
    openedForWith.current = withParam;
    void openOrCreateDm(withParam);
  }, [withParam, client, cryptoReady, openOrCreateDm]);

  useEffect(() => {
    if (!client) return;
    const onDecrypted = () => {
      refreshConversations(client);
      if (activeRoomId) loadTimeline(client, activeRoomId);
    };
    client.on(MatrixEventEvent.Decrypted, onDecrypted);
    return () => {
      client.removeListener(MatrixEventEvent.Decrypted, onDecrypted);
    };
  }, [client, activeRoomId, loadTimeline, refreshConversations]);

  useEffect(() => {
    if (!client || !activeRoomId) return;
    loadTimeline(client, activeRoomId);
    const onTimeline = () => {
      loadTimeline(client, activeRoomId);
      refreshConversations(client);
    };
    const room = client.getRoom(activeRoomId);
    room?.on(RoomEvent.Timeline, onTimeline);
    return () => {
      room?.removeListener(RoomEvent.Timeline, onTimeline);
    };
  }, [client, activeRoomId, loadTimeline, refreshConversations]);

  async function sendMessage() {
    if (!client || !activeRoomId) return;
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await client.sendTextMessage(activeRoomId, text);
    loadTimeline(client, activeRoomId);
    refreshConversations(client);
  }

  if (status === "loading" || status === "idle") {
    return (
      <p className="text-sm text-[var(--gn-text-muted)]">Connecting…</p>
    );
  }

  if (status === "error" && error) {
    return (
      <div
        className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-elevated)] p-4 text-sm text-[var(--gn-text)]"
        role="alert"
      >
        {error}
      </div>
    );
  }

  const hasNoChatHistory = conversations.length === 0;

  return (
    <div className="space-y-4 border-t border-[var(--gn-divide)] pt-4">
      {actionError ? (
        <div
          className="rounded-lg border border-red-300/50 bg-red-500/10 px-4 py-3 text-sm text-[var(--gn-text)]"
          role="alert"
        >
          <p className="font-medium text-red-700 dark:text-red-400">
            Couldn&apos;t open this chat
          </p>
          <p className="mt-1 text-[var(--gn-text-muted)]">{actionError}</p>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-[#ff6a38] hover:underline"
            onClick={() => setActionError(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}
      {hasNoChatHistory ? (
        <div className="rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] px-4 py-3 text-sm">
          <p className="font-medium text-[var(--gn-text)]">No conversations yet</p>
          <p className="mt-1.5 leading-relaxed text-[var(--gn-text-muted)]">
            New chats start from a profile: follow someone, then use{" "}
            <span className="font-medium text-[var(--gn-text)]">Message</span> on
            their page. Open chats will show in the list here.
          </p>
        </div>
      ) : null}
      <div className="flex min-h-[420px] flex-col gap-4 lg:flex-row">
        <div className="flex w-full shrink-0 flex-col border-[var(--gn-divide)] lg:w-64 lg:border-r lg:pr-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
          Conversations
        </p>
        <ul className="max-h-64 space-y-1 overflow-y-auto lg:max-h-[min(60vh,520px)]">
          {conversations.length === 0 ? (
            <li className="text-xs text-[var(--gn-text-muted)]">
              No open chats—use Message on a profile you follow to start one.
            </li>
          ) : (
            conversations.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                    r.id === activeRoomId
                      ? "bg-[var(--gn-surface-hover)] text-[var(--gn-text)]"
                      : "text-[var(--gn-text-muted)] hover:bg-[var(--gn-surface-hover)]"
                  }`}
                  onClick={() => {
                    setActiveRoomId(r.id);
                    setActionError(null);
                  }}
                >
                  {r.label}
                </button>
              </li>
            ))
          )}
        </ul>
        </div>
        <div className="min-w-0 flex-1">
        {busyPeer ? (
          <p className="mb-2 text-xs text-[var(--gn-text-muted)]">
            Opening chat… (this can take up to a minute)
          </p>
        ) : null}
        <div className="mb-3 max-h-[340px] space-y-2 overflow-y-auto rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] p-3">
          {!activeRoomId ? (
            <p className="text-xs text-[var(--gn-text-muted)]">
              {hasNoChatHistory
                ? "After you start a chat from someone’s profile, select it here to read and reply."
                : "Select a conversation to read and reply."}
            </p>
          ) : lines.length === 0 ? (
            <p className="text-xs text-[var(--gn-text-muted)]">
              No messages in this chat yet. Say hello below—your thread will
              build from here.
            </p>
          ) : (
            lines.map((ln) => (
              <div key={ln.id} className="text-sm">
                <span className="font-medium text-[#ff6a38]">
                  {ln.sender.split(":")[0]!.replace("@", "")}
                </span>
                <span className="text-[var(--gn-text-muted)]"> · </span>
                <span className="text-[var(--gn-text)]">{ln.body}</span>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-md border border-[var(--gn-divide)] bg-[var(--gn-surface)] px-3 py-2 text-sm text-[var(--gn-text)]"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message…"
            disabled={!activeRoomId}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
          />
          <button
            type="button"
            className="rounded-md bg-[#ff6a38] px-4 py-2 text-sm font-medium text-white hover:bg-[#ff7d4c] disabled:opacity-50"
            disabled={!activeRoomId || !draft.trim()}
            onClick={() => void sendMessage()}
          >
            Send
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
