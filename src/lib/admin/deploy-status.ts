"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDeployStatus } from "@/lib/admin/github";
import type { DeployStatus } from "@/lib/admin/github";

/** Normalized deploy state for UI consumption */
export type DeployState = "idle" | "in_progress" | "completed" | "failed";

export interface DeployInfo {
  state: DeployState;
  createdAt: string | null;
  loading: boolean;
}

const POLL_INTERVAL_ACTIVE = 10_000; // 10s when deploy is in progress
const POLL_INTERVAL_IDLE = 60_000; // 60s when idle

/**
 * Normalize raw GitHub Actions status into a simple deploy state.
 */
function normalizeStatus(raw: DeployStatus): DeployState {
  if (raw.status === "in_progress" || raw.status === "queued") return "in_progress";
  if (raw.status === "completed") {
    if (raw.conclusion === "success") return "completed";
    return "failed";
  }
  return "idle";
}

/**
 * React hook that polls GitHub Actions deploy status.
 * Polls more frequently when deploy is in progress.
 */
export function useDeployStatus(token: string | null): DeployInfo {
  const [state, setState] = useState<DeployState>("idle");
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const raw = await getDeployStatus(token);
      const normalized = normalizeStatus(raw);
      setState(normalized);
      setCreatedAt(raw.createdAt);
    } catch {
      // Silently fail on polling errors — don't disrupt editing
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchStatus();
  }, [token, fetchStatus]);

  // Adaptive polling
  useEffect(() => {
    if (!token) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const interval = state === "in_progress" ? POLL_INTERVAL_ACTIVE : POLL_INTERVAL_IDLE;
    intervalRef.current = setInterval(fetchStatus, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [token, state, fetchStatus]);

  return { state, createdAt, loading };
}

/**
 * Check if publish/upload should be blocked based on deploy state.
 */
export function isDeployBlocking(state: DeployState): boolean {
  return state === "in_progress";
}
