"use client";

import * as MatrixCryptoWasm from "@matrix-org/matrix-sdk-crypto-wasm";
import { apiFetch } from "@/lib/api-public";
import {
  clearPersistedMatrixDevice,
  deleteLegacyMatrixRustCryptoDbs,
  deleteMatrixRustCryptoDbs,
  isMatrixCryptoStoreMismatchError,
  isMatrixTokenUnauthorizedError,
  loadPersistedMatrixDevice,
  matrixCryptoStorePrefix,
  matrixHomeserverJwtLogin,
  refreshMatrixAccessTokenForDevice,
  savePersistedMatrixDevice,
} from "@/lib/matrix-session-storage";
import { setMessagesUnreadAny } from "@/lib/messages-unread-store";
import { peerMxidForProfileId } from "@/lib/matrix-mxid";
import { createClient } from "@/lib/supabase/client";
import {
  ClientEvent,
  createClient as createMatrixClient,
  EventType,
  KnownMembership,
  MatrixEventEvent,
  MsgType,
  NotificationCountType,
  Preset,
  ReceiptType,
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

/** Homeserver often returns a short initial timeline; paginate backwards for full history. */
const TIMELINE_BACKFILL_TARGET = 45;
const TIMELINE_BACKFILL_PAGE = 60;
const TIMELINE_BACKFILL_MAX_PAGES = 10;

const matrixClientStoreOpts = { timelineSupport: true as const };

function timelineMessageLikeCount(events: MatrixEvent[]): number {
  let n = 0;
  for (const ev of events) {
    const t = ev.getType();
    if (t === EventType.RoomMessage) {
      if (ev.getContent()?.msgtype) n += 1;
      continue;
    }
    if (t === EventType.RoomMessageEncrypted) n += 1;
  }
  return n;
}

/**
 * Fetch older events into the live timeline until we have enough messages or the server ends.
 */
async function backfillRoomHistory(
  client: MatrixClient,
  room: Room,
  cancelRef: { current: boolean },
): Promise<void> {
  const live = room.getLiveTimeline();
  let pages = 0;
  while (!cancelRef.current && pages < TIMELINE_BACKFILL_MAX_PAGES) {
    const events = live.getEvents();
    if (timelineMessageLikeCount(events) >= TIMELINE_BACKFILL_TARGET) break;
    let more: boolean;
    try {
      more = await client.paginateEventTimeline(live, {
        backwards: true,
        limit: TIMELINE_BACKFILL_PAGE,
      });
    } catch {
      break;
    }
    if (!more) break;
    pages += 1;
  }
}

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
  return client.getRooms().filter((r) => {
    const my = r.getMyMembership();
    if (my === KnownMembership.Invite) {
      if (direct.has(r.roomId)) return true;
      const joined = r.getJoinedMemberCount();
      const invited = r.getInvitedMemberCount();
      return joined >= 1 && invited >= 1 && joined + invited <= 3;
    }
    if (my !== KnownMembership.Join) return false;
    if (direct.size > 0 && direct.has(r.roomId)) return true;
    const joined = r.getJoinedMemberCount();
    const invited = r.getInvitedMemberCount();
    if (joined === 2) return true;
    if (joined === 1 && invited >= 1) return true;
    return false;
  });
}

function roomLastTs(r: Room): number {
  const evs = r.getLiveTimeline().getEvents();
  const last = evs[evs.length - 1];
  return last?.getTs() ?? 0;
}

/** Display name only — never fall back to Matrix localpart (e.g. gn_…). */
function membersDisplayNameOnly(
  m: { rawDisplayName?: string; name?: string } | undefined,
  ifEmpty: string,
): string {
  const d = m?.rawDisplayName?.trim() || m?.name?.trim();
  return d || ifEmpty;
}

function dmLabel(client: MatrixClient, room: Room): string {
  const me = client.getUserId();
  if (!me) return room.name || room.roomId;
  if (room.getMyMembership() === KnownMembership.Invite) {
    const inviter =
      room.getJoinedMembers().find((m) => m.userId !== me) ??
      room.getJoinedMembers()[0];
    const who = membersDisplayNameOnly(inviter, "Someone");
    return `${who} (Request)`;
  }
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
    const who = membersDisplayNameOnly(m, "Someone");
    return `${who} (Request)`;
  }
  return room.name || room.getCanonicalAlias() || "Chat";
}

/** Unread for sidebar + nav: invites, server counts, or last others' message vs read receipt. */
function roomHasVisualUnread(
  room: Room,
  myUserId: string,
  isActiveInUi: boolean,
): boolean {
  if (isActiveInUi) return false;
  if (room.getMyMembership() === KnownMembership.Invite) return true;
  if (room.getMyMembership() !== KnownMembership.Join) return false;
  if (
    room.getRoomUnreadNotificationCount(NotificationCountType.Total) > 0 ||
    room.getRoomUnreadNotificationCount(NotificationCountType.Highlight) > 0
  ) {
    return true;
  }
  const timeline = room.getLiveTimeline();
  const events = timeline.getEvents();
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (!ev) continue;
    const t = ev.getType();
    if (t !== EventType.RoomMessage && t !== EventType.RoomMessageEncrypted) {
      continue;
    }
    if (ev.getSender() === myUserId) continue;
    const eid = ev.getId();
    if (!eid) continue;
    try {
      return !room.hasUserReadEvent(myUserId, eid);
    } catch {
      return true;
    }
  }
  return false;
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
    { id: string; label: string; ts: number; unread: boolean }[]
  >([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [lines, setLines] = useState<
    { id: string; sender: string; body: string }[]
  >([]);
  const [draft, setDraft] = useState("");
  const [busyPeer, setBusyPeer] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const openedForWith = useRef<string | null>(null);
  const activeRoomIdRef = useRef<string | null>(null);
  const historyFillCancelRef = useRef(false);

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  const refreshConversations = useCallback((c: MatrixClient) => {
    const me = c.getUserId();
    const activeId = activeRoomIdRef.current;
    const list = listDmRooms(c)
      .map((r) => ({
        id: r.roomId,
        label: dmLabel(c, r),
        ts: roomLastTs(r),
        unread:
          !!me && roomHasVisualUnread(r, me, activeId === r.roomId),
      }))
      .sort((a, b) => b.ts - a.ts);
    setConversations(list);
    setMessagesUnreadAny(list.some((x) => x.unread));
  }, []);

  const senderLineLabel = useCallback((room: Room, senderId: string) => {
    const m = room.getMember(senderId);
    return (
      m?.rawDisplayName ||
      m?.name ||
      senderId.split(":")[0]?.replace("@", "") ||
      "?"
    );
  }, []);

  const loadTimeline = useCallback(
    (c: MatrixClient, roomId: string) => {
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
          else if (ev.isDecryptionFailure())
            body = "Unable to decrypt this message.";
          else body = "Encrypted message…";
          const sid = ev.getSender() ?? "?";
          out.push({
            id: ev.getId()!,
            sender: senderLineLabel(room, sid),
            body,
          });
          continue;
        }
        if (t !== EventType.RoomMessage) continue;
        const root = pickThreadRoot(c, ev);
        const rootContent = root.getContent();
        const rootType = rootContent?.msgtype;
        const sid = root.getSender() ?? "?";
        let body: string | undefined;
        if (rootType === MsgType.Text) {
          body = eventBody(root);
        } else if (rootType === MsgType.Notice || rootType === MsgType.Emote) {
          body = eventBody(root);
        } else if (typeof rootType === "string") {
          const ob = eventBody(root);
          body =
            ob ||
            (rootType === "org.matrix.custom.html" && typeof rootContent?.body === "string"
              ? rootContent.body
              : `[${rootType}]`);
        }
        if (body === undefined) continue;
        out.push({
          id: ev.getId()!,
          sender: senderLineLabel(room, sid),
          body,
        });
      }
      setLines(out);
    },
    [senderLineLabel],
  );

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
          await existing.loadMembersIfNeeded();
          activeRoomIdRef.current = existing.roomId;
          setActiveRoomId(existing.roomId);
          loadTimeline(client, existing.roomId);
          refreshConversations(client);
          router.replace("/messages", { scroll: false });
          return;
        }

        const createRoomWithTimeout = () =>
          Promise.race([
            client.createRoom({
              preset: Preset.TrustedPrivateChat,
              is_direct: true,
              invite: [peerMxid],
            }),
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

        let raced: { room_id: string };
        try {
          raced = await createRoomWithTimeout();
        } catch (firstCreateErr) {
          if (!isMatrixTokenUnauthorizedError(firstCreateErr)) {
            throw firstCreateErr;
          }
          const deviceId = client.getDeviceId();
          if (!deviceId) throw firstCreateErr;
          const bundleFresh = await apiFetch<LoginBundle>("/matrix/login-token", {
            method: "POST",
            body: JSON.stringify({}),
            token: session.access_token,
          });
          const creds = await refreshMatrixAccessTokenForDevice(
            bundleFresh.homeserverUrl,
            bundleFresh.jwt,
            deviceId,
          );
          client.setAccessToken(creds.access_token);
          raced = await createRoomWithTimeout();
        }

        const roomId = raced.room_id;
        await client.sendStateEvent(
          roomId,
          EventType.RoomEncryption,
          { algorithm: "m.megolm.v1.aes-sha2" },
          "",
        );
        await client.getRoom(roomId)?.loadMembersIfNeeded();
        activeRoomIdRef.current = roomId;
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
    let liveBumpTimer: number | undefined;
    let timelineHandler:
      | ((
          ev: MatrixEvent,
          room: Room | undefined,
          toStartOfTimeline?: boolean,
        ) => void)
      | undefined;
    let membershipHandler: (() => void) | undefined;

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
        const wasmAsset = new URL(
          "/wasm/matrix_sdk_crypto_wasm_bg.wasm",
          window.location.origin,
        );

        /**
         * Must use the same module instance as matrix-js-sdk (rust-crypto calls initAsync() with no URL).
         * Run JWT fetch and WASM init in parallel to cut time-to-sync on slow networks.
         */
        const [bundle] = await Promise.all([
          apiFetch<LoginBundle>("/matrix/login-token", {
            method: "POST",
            body: JSON.stringify({}),
            token: session.access_token,
          }),
          (async () => {
            const wasmProbe = await fetch(wasmAsset.href, { method: "GET" });
            if (!wasmProbe.ok) {
              throw new Error(
                `Encryption module not found (${wasmProbe.status}). Try redeploying the site.`,
              );
            }
            await MatrixCryptoWasm.initAsync(wasmAsset);
          })(),
        ]);

        const cryptoPrefix = matrixCryptoStorePrefix(bundle.userId);
        let deviceIdWeRequested = loadPersistedMatrixDevice(bundle.userId);
        let loginResult = await matrixHomeserverJwtLogin(
          bundle.homeserverUrl,
          bundle.jwt,
          deviceIdWeRequested,
        );

        if (!loginResult.ok && deviceIdWeRequested) {
          clearPersistedMatrixDevice();
          await deleteMatrixRustCryptoDbs(cryptoPrefix);
          await deleteLegacyMatrixRustCryptoDbs();
          deviceIdWeRequested = undefined;
          loginResult = await matrixHomeserverJwtLogin(
            bundle.homeserverUrl,
            bundle.jwt,
            undefined,
          );
        }

        if (!loginResult.ok) {
          if (loginResult.status >= 300 && loginResult.status < 400) {
            const loc = loginResult.redirectLocation ?? "";
            throw new Error(
              `Homeserver returned redirect ${loginResult.status}${loc ? ` → ${loc}` : ""} on login. ` +
                `Set SYNAPSE_PUBLIC_BASE_URL to the exact HTTPS URL of the Synapse service (no trailing slash).`,
            );
          }
          throw new Error(
            loginResult.error ||
              loginResult.errcode ||
              (loginResult.raw.length > 0 && loginResult.raw.length < 400
                ? loginResult.raw
                : `Could not sign in to messaging (${loginResult.status})`),
          );
        }

        const loginDeviceId = loginResult.data.device_id;
        if (deviceIdWeRequested && loginDeviceId !== deviceIdWeRequested) {
          await deleteMatrixRustCryptoDbs(cryptoPrefix);
          await deleteLegacyMatrixRustCryptoDbs();
        }

        savePersistedMatrixDevice(loginResult.data.user_id, loginDeviceId);

        mx = createMatrixClient({
          ...matrixClientStoreOpts,
          baseUrl: bundle.homeserverUrl.replace(/\/+$/, ""),
          accessToken: loginResult.data.access_token,
          userId: loginResult.data.user_id,
          deviceId: loginDeviceId,
        });

        const initRustOrThrow = async (
          client: MatrixClient,
          prefix: string,
        ) => {
          try {
            await client.initRustCrypto({ cryptoDatabasePrefix: prefix });
          } catch (e) {
            console.error("Matrix initRustCrypto failed", e);
            const detail = e instanceof Error ? e.message : String(e);
            throw new Error(
              detail
                ? `Could not initialize encryption: ${detail.slice(0, 280)}`
                : "Could not initialize encryption. Try refreshing the page.",
            );
          }
        };

        try {
          await initRustOrThrow(mx, cryptoPrefix);
        } catch (firstCryptoErr) {
          if (!isMatrixCryptoStoreMismatchError(firstCryptoErr)) {
            throw firstCryptoErr;
          }
          mx.stopClient();
          mx = null;
          clearPersistedMatrixDevice();
          await deleteMatrixRustCryptoDbs(cryptoPrefix);
          await deleteLegacyMatrixRustCryptoDbs();
          const bundle2 = await apiFetch<LoginBundle>("/matrix/login-token", {
            method: "POST",
            body: JSON.stringify({}),
            token: session.access_token,
          });
          const login2 = await matrixHomeserverJwtLogin(
            bundle2.homeserverUrl,
            bundle2.jwt,
            undefined,
          );
          if (!login2.ok) {
            throw new Error(
              login2.error ||
                login2.errcode ||
                `Could not sign in after encryption reset (${login2.status})`,
            );
          }
          savePersistedMatrixDevice(login2.data.user_id, login2.data.device_id);
          mx = createMatrixClient({
            ...matrixClientStoreOpts,
            baseUrl: bundle2.homeserverUrl.replace(/\/+$/, ""),
            accessToken: login2.data.access_token,
            userId: login2.data.user_id,
            deviceId: login2.data.device_id,
          });
          await initRustOrThrow(
            mx,
            matrixCryptoStorePrefix(login2.data.user_id),
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

        timelineHandler = (_ev, _room, toStartOfTimeline) => {
          if (toStartOfTimeline) return;
          if (liveBumpTimer) window.clearTimeout(liveBumpTimer);
          liveBumpTimer = window.setTimeout(() => {
            refreshConversations(mx!);
            const ar = activeRoomIdRef.current;
            if (ar) loadTimeline(mx!, ar);
          }, 120);
        };
        membershipHandler = () => {
          refreshConversations(mx!);
          const ar = activeRoomIdRef.current;
          if (ar) loadTimeline(mx!, ar);
        };
        mx.on(RoomEvent.Timeline, timelineHandler);
        mx.on(RoomEvent.MyMembership, membershipHandler);

        // Do not use lazyLoadMembers: encrypted sends need the full member/device
        // list or recipients may get no session key (one-way "they don't get my messages").
        await mx.startClient({
          resolveInvitesToProfiles: true,
        });
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
      if (liveBumpTimer) window.clearTimeout(liveBumpTimer);
      if (mx && timelineHandler) {
        mx.removeListener(RoomEvent.Timeline, timelineHandler);
      }
      if (mx && membershipHandler) {
        mx.removeListener(RoomEvent.MyMembership, membershipHandler);
      }
      mx?.stopClient();
    };
  }, [refreshConversations, loadTimeline]);

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

  /** Load older events from the homeserver — initial /sync often only includes recent timeline chunks. */
  useEffect(() => {
    if (!client || !activeRoomId || !cryptoReady) return;
    const room = client.getRoom(activeRoomId);
    if (!room) return;
    historyFillCancelRef.current = false;
    setHistoryLoading(true);
    void (async () => {
      try {
        await backfillRoomHistory(client, room, historyFillCancelRef);
      } finally {
        setHistoryLoading(false);
        if (!historyFillCancelRef.current) {
          loadTimeline(client, activeRoomId);
          refreshConversations(client);
        }
      }
    })();
    return () => {
      historyFillCancelRef.current = true;
    };
  }, [
    client,
    activeRoomId,
    cryptoReady,
    loadTimeline,
    refreshConversations,
  ]);

  useEffect(() => {
    if (!client || !activeRoomId || !cryptoReady) return;
    const room = client.getRoom(activeRoomId);
    if (!room || room.getMyMembership() !== KnownMembership.Join) return;
    const last = room.getLastLiveEvent();
    if (!last?.getId()) return;
    let cancelled = false;
    void client
      .sendReadReceipt(last, ReceiptType.Read, true)
      .catch(() => {})
      .finally(() => {
        if (!cancelled) refreshConversations(client);
      });
    return () => {
      cancelled = true;
    };
  }, [client, activeRoomId, cryptoReady, refreshConversations]);

  async function leaveActiveChat() {
    if (!client || !activeRoomId) return;
    if (
      !window.confirm(
        "Leave this chat? It disappears from your list; you can start a new one from their profile with Message.",
      )
    )
      return;
    setActionError(null);
    try {
      const id = activeRoomId;
      await client.leave(id);
      activeRoomIdRef.current = null;
      setActiveRoomId(null);
      setLines([]);
      refreshConversations(client);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not leave this chat.",
      );
    }
  }

  async function sendMessage() {
    if (!client || !activeRoomId) return;
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setActionError(null);
    try {
      const room = client.getRoom(activeRoomId);
      if (room) await room.loadMembersIfNeeded();
      await client.sendTextMessage(activeRoomId, text);
      loadTimeline(client, activeRoomId);
      refreshConversations(client);
    } catch (e) {
      setDraft(text);
      setActionError(
        e instanceof Error ? e.message : "Could not send this message.",
      );
    }
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
            Messaging
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
                    if (!client) return;
                    void (async () => {
                      const room = client.getRoom(r.id);
                      if (
                        room?.getMyMembership() === KnownMembership.Invite
                      ) {
                        try {
                          await client.joinRoom(r.id);
                        } catch (e) {
                          setActionError(
                            e instanceof Error
                              ? e.message
                              : "Could not accept the invite.",
                          );
                          return;
                        }
                      }
                      await client.getRoom(r.id)?.loadMembersIfNeeded();
                      activeRoomIdRef.current = r.id;
                      setActiveRoomId(r.id);
                      setActionError(null);
                      loadTimeline(client, r.id);
                      refreshConversations(client);
                    })();
                  }}
                >
                  <span className="flex w-full items-start gap-2 text-left">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        r.unread ? "bg-[#ff6a38]" : "invisible"
                      }`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">{r.label}</span>
                  </span>
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
        {historyLoading && activeRoomId ? (
          <p className="mb-2 text-xs text-[var(--gn-text-muted)]">
            Loading older messages from the server…
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
              {historyLoading
                ? "Fetching your chat history…"
                : "No messages in this chat yet. Say hello below—your thread will build from here."}
            </p>
          ) : (
            lines.map((ln) => (
              <div key={ln.id} className="text-sm">
                <span className="font-medium text-[#ff6a38]">{ln.sender}</span>
                <span className="text-[var(--gn-text-muted)]"> · </span>
                <span className="text-[var(--gn-text)]">{ln.body}</span>
              </div>
            ))
          )}
        </div>
        <div className="space-y-2">
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
          {activeRoomId &&
          client?.getRoom(activeRoomId)?.getMyMembership() ===
            KnownMembership.Join ? (
            <p className="text-xs text-[var(--gn-text-muted)]">
              <button
                type="button"
                className="font-medium text-[#ff6a38] hover:underline"
                onClick={() => void leaveActiveChat()}
              >
                Leave this chat
              </button>
              <span className="text-[var(--gn-text-muted)]">
                {" "}
                — removes it from your list (the thread stays on the server).
              </span>
            </p>
          ) : null}
        </div>
        </div>
      </div>
    </div>
  );
}
