/**
 * Notebooks created before this instant skip the first-run setup wizard even if
 * `setupWizardCompletedAt` is null (existing rows / pre-feature notebooks).
 */
export const NOTEBOOK_SETUP_WIZARD_SINCE_ISO = "2026-04-01T00:00:00.000Z";

export function needsNotebookSetupWizard(nb: {
  createdAt?: string | null;
  setupWizardCompletedAt?: string | null;
}): boolean {
  if (nb.setupWizardCompletedAt) return false;
  if (!nb.createdAt) return false;
  return (
    new Date(normalizeApiTimestamp(nb.createdAt)) >=
    new Date(NOTEBOOK_SETUP_WIZARD_SINCE_ISO)
  );
}

function normalizeApiTimestamp(s: string): string {
  const t = s.trim();
  if (!t) return "";
  if (/^\d{4}-\d{2}-\d{2}T/.test(t)) return t;
  if (/^\d{4}-\d{2}-\d{2} /.test(t)) return t.replace(" ", "T");
  return t;
}
