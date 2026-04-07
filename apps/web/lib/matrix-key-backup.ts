import type { MatrixClient } from "matrix-js-sdk";
import { apiFetch } from "./api-public";
import {
  primeMatrixSsssLocal,
  readMatrixSsssFromLocal,
} from "./matrix-secret-storage-callbacks";

/**
 * Load 4S key from Growers API (encrypted at rest per profile) before Matrix crypto init
 * so any device where you’re logged in can unlock Megolm backup.
 */
export async function tryPrimeMatrixSsssFromGrowersApi(
  matrixUserId: string,
  token: string,
): Promise<void> {
  try {
    const wrap = await apiFetch<{ keyId: string; privateKeyB64: string }>(
      "/matrix/secret-storage-wrap",
      { token },
    );
    primeMatrixSsssLocal(matrixUserId, wrap);
  } catch {
    /* 404 or wrap not configured */
  }
}

/** Persist latest 4S key to the API so other browsers can prime from the profile. */
export async function syncMatrixSsssWrapToServer(
  token: string,
  matrixUserId: string,
): Promise<void> {
  const b = readMatrixSsssFromLocal(matrixUserId);
  if (!b) return;
  try {
    await apiFetch("/matrix/secret-storage-wrap", {
      method: "POST",
      body: JSON.stringify(b),
      token,
    });
  } catch (e) {
    console.warn("[matrix] profile secret-storage sync failed", e);
  }
}

/**
 * Ensure megolm session keys are backed up to the homeserver and restorable on new devices
 * (4S key: localStorage + Growers-wrapped copy on the API for cross-browser restore).
 */
export async function ensureMatrixKeyBackup(client: MatrixClient): Promise<void> {
  const crypto = client.getCrypto();
  if (!crypto) return;

  try {
    await crypto.loadSessionBackupPrivateKeyFromSecretStorage();
  } catch {
    /* No megolm backup secret in account data yet, or 4S not unlocked. */
  }

  await crypto.checkKeyBackupAndEnable();

  try {
    await crypto.restoreKeyBackup({});
  } catch {
    /* No backup version / key not in cache — normal before first backup. */
  }

  const backupOnServer = await crypto.getKeyBackupInfo();
  if (backupOnServer?.version) {
    return;
  }

  const { ready } = await crypto.getSecretStorageStatus();
  if (ready) {
    return;
  }

  try {
    await crypto.bootstrapSecretStorage({
      createSecretStorageKey: async () => {
        const privateKey = new Uint8Array(32);
        globalThis.crypto.getRandomValues(privateKey);
        return {
          privateKey,
          keyInfo: { name: "Growers Notebook" },
        };
      },
      setupNewSecretStorage: true,
      setupNewKeyBackup: true,
    });
    await crypto.checkKeyBackupAndEnable();
    try {
      await crypto.restoreKeyBackup({});
    } catch {
      /* ignore */
    }
  } catch (e) {
    console.error("[matrix] ensureMatrixKeyBackup: bootstrap failed", e);
  }
}
