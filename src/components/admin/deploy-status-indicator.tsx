"use client";

import type { DeployState } from "@/lib/admin/deploy-status";

interface DeployStatusIndicatorProps {
  state: DeployState;
  createdAt: string | null;
}

const STATE_CONFIG: Record<DeployState, { label: string; dotClass: string; textClass: string }> = {
  idle: {
    label: "Deploy: idle",
    dotClass: "bg-gray-400",
    textClass: "text-muted-foreground",
  },
  completed: {
    label: "Deploy: completed",
    dotClass: "bg-green-500",
    textClass: "text-green-600 dark:text-green-400",
  },
  in_progress: {
    label: "Deploy: in progress",
    dotClass: "bg-yellow-500 animate-pulse",
    textClass: "text-yellow-600 dark:text-yellow-400",
  },
  failed: {
    label: "Deploy: failed",
    dotClass: "bg-red-500",
    textClass: "text-red-600 dark:text-red-400",
  },
};

export function DeployStatusIndicator({ state, createdAt }: DeployStatusIndicatorProps) {
  const config = STATE_CONFIG[state];

  return (
    <div
      className="flex items-center gap-1.5"
      data-testid="deploy-status"
      data-deploy-state={state}
      title={createdAt ? `Last run: ${new Date(createdAt).toLocaleString()}` : undefined}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${config.dotClass}`}
        aria-hidden="true"
      />
      <span className={`text-xs ${config.textClass}`} data-testid="deploy-status-label">
        {config.label}
      </span>
    </div>
  );
}
