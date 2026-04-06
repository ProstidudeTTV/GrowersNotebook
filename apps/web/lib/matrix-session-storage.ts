import { MatrixError } from "matrix-js-sdk";

/** localStorage: stable Matrix device_id per MXID (JWT login otherwise mints a new device every visit). */
const DEVICE_LS_KEY = "gn-matrix-device-v1";

type StoredDevice = { userId: string; deviceId: string };

export function loadPersistedMatrixDevice(matrixUserId: string): string | undefined {
  try {
    const raw = localStorage.getItem(DEVICE_LS_KEY);
    if (!raw) return undefined;
    const p = JSON.parse(raw) as StoredDevice;
    return p.userId === matrixUserId ? p.deviceId : undefined;
  } catch {
    return undefined;
  }
}

export function savePersistedMatrixDevice(
  matrixUserId: string,
  deviceId: string,
): void {
  localStorage.setItem(
    DEVICE_LS_KEY,
    JSON.stringify({ userId: matrixUserId, deviceId } satisfies StoredDevice),
  );
}

export function clearPersistedMatrixDevice(): void {
  localStorage.removeItem(DEVICE_LS_KEY);
}

/** Prefix for rust-crypto IndexedDB; keeps stores separate per MXID. */
export function matrixCryptoStorePrefix(matrixUserId: string): string {
  return `gnweb-${matrixUserId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

/** Rust crypto uses `${prefix}::matrix-sdk-crypto` and `::matrix-sdk-crypto-meta`. */
export async function deleteMatrixRustCryptoDbs(prefix: string): Promise<void> {
  const names = [
    `${prefix}::matrix-sdk-crypto`,
    `${prefix}::matrix-sdk-crypto-meta`,
  ];
  for (const name of names) {
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  }
}

/** Default matrix-js-sdk prefix before we scoped crypto per-user — clear on recovery/mismatch. */
const LEGACY_RUST_CRYPTO_PREFIX = "matrix-js-sdk";

export async function deleteLegacyMatrixRustCryptoDbs(): Promise<void> {
  await deleteMatrixRustCryptoDbs(LEGACY_RUST_CRYPTO_PREFIX);
}

export function isMatrixCryptoStoreMismatchError(err: unknown): boolean {
  const s = err instanceof Error ? err.message : String(err);
  return /account in the store doesn't match|doesn't match the account in the constructor/i.test(
    s,
  );
}

export type MatrixHomeserverLoginOk = {
  access_token: string;
  user_id: string;
  device_id: string;
};

export function isMatrixTokenUnauthorizedError(e: unknown): boolean {
  if (e instanceof MatrixError) {
    if (e.httpStatus === 401) return true;
    if (e.errcode === "M_UNKNOWN_TOKEN") return true;
  }
  if (e instanceof Error && /invalid access token/i.test(e.message)) {
    return true;
  }
  return false;
}

/** New Matrix access token for an existing device (Synapse JWT login). */
export async function refreshMatrixAccessTokenForDevice(
  homeserverUrl: string,
  jwt: string,
  deviceId: string,
): Promise<MatrixHomeserverLoginOk> {
  const loginResult = await matrixHomeserverJwtLogin(
    homeserverUrl,
    jwt,
    deviceId,
  );
  if (!loginResult.ok) {
    throw new Error(
      loginResult.error ||
        loginResult.errcode ||
        `Could not refresh messaging session (${loginResult.status})`,
    );
  }
  const { data } = loginResult;
  if (data.device_id !== deviceId) {
    throw new Error(
      "Messaging session changed on the server. Reload the page to continue.",
    );
  }
  savePersistedMatrixDevice(data.user_id, data.device_id);
  return data;
}

export async function matrixHomeserverJwtLogin(
  homeserverUrl: string,
  jwt: string,
  deviceId?: string,
): Promise<
  | { ok: true; data: MatrixHomeserverLoginOk }
  | {
      ok: false;
      status: number;
      errcode?: string;
      error?: string;
      raw: string;
      redirectLocation?: string;
    }
> {
  const loginUrl = `${homeserverUrl.replace(/\/+$/, "")}/_matrix/client/v3/login`;
  const payload: Record<string, string> = {
    type: "org.matrix.login.jwt",
    token: jwt,
  };
  if (deviceId) payload.device_id = deviceId;

  const loginRes = await fetch(loginUrl, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (loginRes.status >= 300 && loginRes.status < 400) {
    const loc = loginRes.headers.get("Location") ?? "";
    return {
      ok: false,
      status: loginRes.status,
      redirectLocation: loc || undefined,
      raw: `Homeserver redirect ${loginRes.status}${loc ? ` → ${loc}` : ""}`,
    };
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
    return {
      ok: false,
      status: loginRes.status,
      raw: loginRaw.slice(0, 200),
    };
  }

  if (!loginRes.ok) {
    return {
      ok: false,
      status: loginRes.status,
      errcode: loginJson.errcode,
      error: loginJson.error,
      raw: loginRaw,
    };
  }

  if (
    !loginJson.access_token ||
    !loginJson.user_id ||
    !loginJson.device_id
  ) {
    return {
      ok: false,
      status: loginRes.status,
      raw: "Messaging login response missing credentials.",
    };
  }

  return {
    ok: true,
    data: {
      access_token: loginJson.access_token,
      user_id: loginJson.user_id,
      device_id: loginJson.device_id,
    },
  };
}
