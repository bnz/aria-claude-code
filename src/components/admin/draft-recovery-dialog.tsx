"use client";

import { AdminButton } from "@/components/admin/ui";

interface DraftRecoveryDialogProps {
  onRestore: () => void;
  onDiscard: () => void;
}

/**
 * Dialog shown when a local draft exists for the data being loaded.
 * User can restore the draft or discard it in favor of the server version.
 */
export function DraftRecoveryDialog({ onRestore, onDiscard }: DraftRecoveryDialogProps) {
  return (
    <div
      className="rounded-lg border border-yellow-400 bg-yellow-50 p-4 dark:border-yellow-600 dark:bg-yellow-950"
      role="alert"
      data-testid="draft-recovery-dialog"
    >
      <p className="mb-3 text-sm font-medium text-yellow-800 dark:text-yellow-200">
        A local draft was found. Would you like to restore it or discard it and use the server
        version?
      </p>
      <div className="flex gap-2">
        <AdminButton
          variant="primary"
          size="sm"
          onClick={onRestore}
          data-testid="draft-restore-btn"
        >
          Restore draft
        </AdminButton>
        <AdminButton
          variant="secondary"
          size="sm"
          onClick={onDiscard}
          data-testid="draft-discard-btn"
        >
          Discard draft
        </AdminButton>
      </div>
    </div>
  );
}
