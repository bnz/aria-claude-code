"use client";

interface DraftIndicatorProps {
  visible: boolean;
}

/**
 * Yellow dot indicator for unsaved draft changes.
 * Shows next to section headers or in the navigation when there are dirty drafts.
 */
export function DraftIndicator({ visible }: DraftIndicatorProps) {
  if (!visible) return null;

  return (
    <span
      className="inline-block h-2 w-2 rounded-full bg-yellow-500"
      title="Unsaved changes"
      data-testid="draft-indicator"
      aria-label="Unsaved changes"
    />
  );
}
