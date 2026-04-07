/**
 * Matrix "secret storage" (4S) callbacks so megolm key backup can unlock on this browser.
 * The AES key is persisted in localStorage (same trust boundary as `gn-matrix-device-v1`).
 */

const LS_PREFIX = "gn-matrix-ssss-v1:";

function storageKeyForUser(matrixUserId: string): string {
  return `${LS_PREFIX}${matrixUserId.replace(/:/g, "_")}`;
}

function u8ToPrivateKeyB64(key: Uint8Array): string {
  let s = "";
  for (let i = 0; i < key.length; i++) s += String.fromCharCode(key[i]!);
  return btoa(s);
}

function b64ToPrivateKey(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function matrixSecretStorageCallbacks(matrixUserId: string) {
  const lsKey = storageKeyForUser(matrixUserId);

  function loadCached(): { keyId: string; privateKey: Uint8Array } | null {
    try {
      const raw = localStorage.getItem(lsKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        keyId?: unknown;
        privateKeyB64?: unknown;
      };
      if (
        typeof parsed.keyId !== "string" ||
        typeof parsed.privateKeyB64 !== "string"
      ) {
        return null;
      }
      return { keyId: parsed.keyId, privateKey: b64ToPrivateKey(parsed.privateKeyB64) };
    } catch {
      return null;
    }
  }

  return {
    getSecretStorageKey: async ({ keys }: { keys: Record<string, unknown> }) => {
      const cached = loadCached();
      if (!cached) {
        throw new Error(
          "Messaging security key missing on this device. Use the same browser you used for Messages before, or clear site data only after exporting is supported.",
        );
      }
      if (!keys[cached.keyId]) {
        throw new Error(
          "Stored messaging key does not match this account. Try the browser profile where you first used Messages.",
        );
      }
      const key = new Uint8Array(cached.privateKey);
      return [cached.keyId, key] as [string, Uint8Array<ArrayBuffer>];
    },

    cacheSecretStorageKey: (
      keyId: string,
      _keyInfo: unknown,
      privateKey: Uint8Array,
    ) => {
      localStorage.setItem(
        lsKey,
        JSON.stringify({ keyId, privateKeyB64: u8ToPrivateKeyB64(privateKey) }),
      );
    },
  };
}
