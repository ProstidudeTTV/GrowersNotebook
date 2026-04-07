import type { MatrixClient } from "matrix-js-sdk";

/**
 * Ensure megolm session keys are backed up to the homeserver and restorable on new devices
 * (same browser profile: 4S AES key lives in localStorage — see matrix-secret-storage-callbacks).
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
