"use client";

import { apiFetch } from "@/lib/api-public";
import { createClient } from "@/lib/supabase/client";
import {
  ClientEvent,
  EventType,
  MsgType,
  type MatrixClient,
  type MatrixEvent,
  RoomEvent,
  SyncState,
} from "matrix-js-sdk";
import { useCallback, useEffect, useState } from "react";

type LoginBundle = {
  homeserverUrl: string;
  userId: string;
  jwt: string;
  expiresIn: number;
};

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

export function MessagesPanel() {
  const [status, setStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<MatrixClient | null>(null);
  const [rooms, setRooms] = useState<{ id: string; label: string }[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [lines, setLines] = useState<
    { id: string; sender: string; body: string }[]
  >([]);
  const [draft, setDraft] = useState("");

  const refreshRoomList = useCallback((c: MatrixClient) => {
    const list = c
      .getRooms()
      .filter((r) => r.getMyMembership() === "join")
      .map((r) => ({
        id: r.roomId,
        label: r.name || r.getCanonicalAlias() || r.roomId,
      }));
    setRooms(list);
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
      if (ev.getType() !== EventType.RoomMessage) continue;
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

  useEffect(() => {
    let mx: MatrixClient | null = null;
    let cancelled = false;

    (async () => {
      setStatus("loading");
      setError(null);
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

        try {
          const wasm = await import("@matrix-org/matrix-sdk-crypto-wasm");
          wasm.start();
        } catch {
          /* WASM init optional; encrypted rooms may not decrypt without this */
        }

        const loginRes = await fetch(
          `${bundle.homeserverUrl.replace(/\/+$/, "")}/_matrix/client/v3/login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "org.matrix.login.jwt",
              token: bundle.jwt,
            }),
          },
        );
        const loginJson = (await loginRes.json()) as {
          access_token?: string;
          user_id?: string;
          device_id?: string;
          errcode?: string;
          error?: string;
        };
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

        const sdk = await import("matrix-js-sdk");
        mx = sdk.createClient({
          baseUrl: bundle.homeserverUrl.replace(/\/+$/, ""),
          accessToken: loginJson.access_token,
          userId: loginJson.user_id,
          deviceId: loginJson.device_id,
        });

        mx.on(ClientEvent.Sync, (st) => {
          if (st === SyncState.Prepared) {
            refreshRoomList(mx!);
            const first = mx!.getRooms().find((r) => r.getMyMembership() === "join");
            if (first) {
              setActiveRoomId(first.roomId);
              loadTimeline(mx!, first.roomId);
            }
          }
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
        refreshRoomList(mx);
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
      mx?.stopClient();
    };
  }, [refreshRoomList, loadTimeline]);

  useEffect(() => {
    if (!client || !activeRoomId) return;
    loadTimeline(client, activeRoomId);
    const onTimeline = () => loadTimeline(client, activeRoomId);
    const room = client.getRoom(activeRoomId);
    room?.on(RoomEvent.Timeline, onTimeline);
    return () => {
      room?.removeListener(RoomEvent.Timeline, onTimeline);
    };
  }, [client, activeRoomId, loadTimeline]);

  async function sendMessage() {
    if (!client || !activeRoomId) return;
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await client.sendTextMessage(activeRoomId, text);
    loadTimeline(client, activeRoomId);
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

  return (
    <div className="flex min-h-[420px] gap-4 border-t border-[var(--gn-divide)] pt-4">
      <div className="w-56 shrink-0 border-r border-[var(--gn-divide)] pr-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--gn-text-muted)]">
          Rooms
        </p>
        <ul className="space-y-1">
          {rooms.length === 0 ? (
            <li className="text-xs text-[var(--gn-text-muted)]">
              No rooms yet. Join or create one in another messaging app, or
              invite this account.
            </li>
          ) : (
            rooms.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                    r.id === activeRoomId
                      ? "bg-[var(--gn-surface-hover)] text-[var(--gn-text)]"
                      : "text-[var(--gn-text-muted)] hover:bg-[var(--gn-surface-hover)]"
                  }`}
                  onClick={() => setActiveRoomId(r.id)}
                >
                  {r.label}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-3 max-h-[340px] space-y-2 overflow-y-auto rounded-lg border border-[var(--gn-divide)] bg-[var(--gn-surface-muted)] p-3">
          {lines.length === 0 ? (
            <p className="text-xs text-[var(--gn-text-muted)]">
              {activeRoomId
                ? "No messages yet."
                : "Select a room or wait for sync."}
            </p>
          ) : (
            lines.map((ln) => (
              <div key={ln.id} className="text-sm">
                <span className="font-medium text-[#ff6a38]">
                  {ln.sender.split(":")[0].replace("@", "")}
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
  );
}
