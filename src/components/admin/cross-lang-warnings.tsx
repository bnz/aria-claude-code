"use client";

import { useMemo, useState } from "react";
import type { CrossLangResult, ValidationMode } from "@/lib/admin/cross-lang-validation";
import { canPublish } from "@/lib/admin/cross-lang-validation";
import { AdminButton } from "@/components/admin/ui";

interface CrossLangWarningsProps {
  result: CrossLangResult;
  mode: ValidationMode;
  onPublishDecision?: (allowed: boolean) => void;
}

/**
 * Displays cross-language validation issues.
 * In soft mode, shows a confirmation dialog for warnings.
 * In strict mode, blocks publish when any issues exist.
 */
export function CrossLangWarnings({ result, mode, onPublishDecision }: CrossLangWarningsProps) {
  const [confirmed, setConfirmed] = useState(false);

  const errors = useMemo(() => result.issues.filter((i) => i.severity === "error"), [result]);
  const warnings = useMemo(() => result.issues.filter((i) => i.severity === "warning"), [result]);

  const publishAllowed = useMemo(
    () => canPublish(result, mode, confirmed),
    [result, mode, confirmed],
  );

  if (result.issues.length === 0) return null;

  return (
    <div className="space-y-3 rounded-lg border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-yellow-950" data-testid="cross-lang-warnings">
      <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
        Cross-language validation
      </h4>

      {errors.length > 0 && (
        <div className="space-y-1" data-testid="cross-lang-errors">
          {errors.map((issue, idx) => (
            <div key={`error-${idx}`} className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
              <span className="shrink-0" aria-hidden="true">&#x2716;</span>
              <span data-testid={`cross-lang-error-${idx}`}>{issue.message}</span>
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-1" data-testid="cross-lang-warnings-list">
          {warnings.map((issue, idx) => (
            <div key={`warning-${idx}`} className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-300">
              <span className="shrink-0" aria-hidden="true">&#x26A0;</span>
              <span data-testid={`cross-lang-warning-${idx}`}>{issue.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Mode indicator */}
      <div className="text-xs text-muted-foreground" data-testid="cross-lang-mode">
        Mode: {mode === "strict" ? "Strict (publish blocked with warnings)" : "Soft (publish allowed after confirmation)"}
      </div>

      {/* Soft mode confirmation */}
      {mode === "soft" && warnings.length > 0 && errors.length === 0 && !confirmed && (
        <div className="flex gap-2" data-testid="cross-lang-confirm-prompt">
          <AdminButton
            variant="primary"
            size="sm"
            onClick={() => {
              setConfirmed(true);
              onPublishDecision?.(true);
            }}
            data-testid="cross-lang-confirm-button"
          >
            Continue anyway
          </AdminButton>
          <AdminButton
            variant="secondary"
            size="sm"
            onClick={() => onPublishDecision?.(false)}
            data-testid="cross-lang-cancel-button"
          >
            Go back and fix
          </AdminButton>
        </div>
      )}

      {/* Status messages */}
      {errors.length > 0 && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400" data-testid="cross-lang-blocked">
          Publish blocked: fix errors first.
        </p>
      )}

      {mode === "strict" && warnings.length > 0 && errors.length === 0 && (
        <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400" data-testid="cross-lang-strict-blocked">
          Publish blocked (strict mode): resolve all warnings.
        </p>
      )}

      {confirmed && publishAllowed && (
        <p className="text-xs font-medium text-green-600 dark:text-green-400" data-testid="cross-lang-confirmed">
          Confirmed. Publish allowed.
        </p>
      )}
    </div>
  );
}

/**
 * Inline field-level warning indicator.
 * Shows a small warning icon next to fields that have cross-language issues.
 */
export function FieldWarningIcon({ hasWarning }: { hasWarning: boolean }) {
  if (!hasWarning) return null;
  return (
    <span
      className="inline-block ml-1 text-yellow-500"
      aria-label="Cross-language warning"
      data-testid="field-warning-icon"
    >
      &#x26A0;&#xFE0F;
    </span>
  );
}
