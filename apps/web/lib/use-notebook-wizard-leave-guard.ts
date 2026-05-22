"use client";

import { useCallback, useEffect, useState } from "react";

/** Warn on tab close and gate modal dismiss when a notebook wizard has edits. */
export function useNotebookWizardLeaveGuard(open: boolean, dirty: boolean) {
  const [leaveOpen, setLeaveOpen] = useState(false);

  useEffect(() => {
    if (!open || !dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [open, dirty]);

  const requestClose = useCallback(
    (onClose: () => void, opts?: { saving?: boolean }) => {
      if (opts?.saving || !dirty) {
        onClose();
        return;
      }
      setLeaveOpen(true);
    },
    [dirty],
  );

  const confirmLeave = useCallback((onClose: () => void) => {
    setLeaveOpen(false);
    onClose();
  }, []);

  const dismissLeave = useCallback(() => setLeaveOpen(false), []);

  return { leaveOpen, requestClose, confirmLeave, dismissLeave };
}
