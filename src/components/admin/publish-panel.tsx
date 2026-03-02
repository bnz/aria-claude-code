"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminAuth } from "@/lib/admin/auth-context";
import { createContentManager } from "@/lib/admin/content-manager";
import { commitFile } from "@/lib/admin/github";
import {
  getChangedFiles,
  loadDraft,
  clearDraft,
  setOriginal,
} from "@/lib/admin/draft-manager";
import { AdminButton } from "@/components/admin/ui";

type PublishState = "idle" | "reviewing" | "publishing" | "done" | "error";

interface CommitResult {
  path: string;
  status: "pending" | "committed" | "error";
  error?: string;
}

/**
 * Publish button that shows changed file count.
 * Opens the publish panel when clicked.
 */
export function PublishButton({ onClick }: { onClick: () => void }) {
  const [changedCount, setChangedCount] = useState(0);

  useEffect(() => {
    const update = () => setChangedCount(getChangedFiles().length);
    update();
    const interval = setInterval(update, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={onClick}
      disabled={changedCount === 0}
      className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        changedCount > 0
          ? "bg-accent text-accent-foreground hover:bg-accent/90"
          : "bg-muted text-muted-foreground cursor-not-allowed"
      }`}
      data-testid="publish-button"
    >
      Publish
      {changedCount > 0 && (
        <span
          className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white"
          data-testid="publish-count"
        >
          {changedCount}
        </span>
      )}
    </button>
  );
}

/**
 * Publish panel: pre-publish review, sequential commits, post-publish cleanup.
 */
export function PublishPanel({ onClose }: { onClose: () => void }) {
  const { token } = useAdminAuth();
  const [state, setState] = useState<PublishState>("reviewing");
  const [changedFiles, setChangedFiles] = useState<string[]>([]);
  const [commitResults, setCommitResults] = useState<CommitResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [publishError, setPublishError] = useState<string | null>(null);

  const cm = useMemo(() => {
    if (!token) return null;
    return createContentManager(token);
  }, [token]);

  // Load changed files on mount
  useEffect(() => {
    setChangedFiles(getChangedFiles());
  }, []);

  // Execute publish: sequential commits
  const executePublish = useCallback(async () => {
    if (!token || !cm || changedFiles.length === 0) return;

    setState("publishing");
    setPublishError(null);

    const results: CommitResult[] = changedFiles.map((path) => ({
      path,
      status: "pending",
    }));
    setCommitResults([...results]);

    for (let i = 0; i < changedFiles.length; i++) {
      setCurrentIndex(i);
      const filePath = changedFiles[i];

      try {
        const draft = loadDraft<unknown>(filePath);
        if (!draft) {
          results[i] = { path: filePath, status: "error", error: "No draft data found" };
          setCommitResults([...results]);
          setPublishError(`No draft data for "${filePath}"`);
          setState("error");
          return;
        }

        const content = JSON.stringify(draft, null, 2);
        const sha = cm.getSha(filePath);
        const filename = filePath.split("/").pop() ?? filePath;
        const message = `Update ${filename} — ${new Date().toISOString()}`;

        const newSha = await commitFile(token, filePath, content, message, sha);

        // Update SHA cache for future commits
        cm.invalidateCache(filePath);

        // Clear draft and update original
        setOriginal(filePath, draft);
        clearDraft(filePath);

        results[i] = { path: filePath, status: "committed" };
        setCommitResults([...results]);

        // Small delay between commits to avoid rate limiting
        if (i < changedFiles.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      } catch (err) {
        results[i] = {
          path: filePath,
          status: "error",
          error: err instanceof Error ? err.message : "Commit failed",
        };
        setCommitResults([...results]);
        setPublishError(
          `Failed at file ${i + 1}/${changedFiles.length}: "${filePath}"`,
        );
        setState("error");
        return;
      }
    }

    setState("done");
  }, [token, cm, changedFiles]);

  // --- Render ---

  if (changedFiles.length === 0 && state === "reviewing") {
    return (
      <div className="space-y-4 rounded-lg border border-border p-4" data-testid="publish-panel">
        <h3 className="text-lg font-semibold text-foreground">Publish</h3>
        <p className="text-sm text-muted-foreground">No changes to publish.</p>
        <AdminButton variant="secondary" size="sm" onClick={onClose}>Close</AdminButton>
      </div>
    );
  }

  // Reviewing: show file list, confirm
  if (state === "reviewing") {
    return (
      <div className="space-y-4 rounded-lg border border-border p-4" data-testid="publish-panel">
        <h3 className="text-lg font-semibold text-foreground">Publish Changes</h3>

        <div className="space-y-1" data-testid="publish-file-list">
          <p className="text-sm font-medium text-muted-foreground">
            {changedFiles.length} file{changedFiles.length !== 1 ? "s" : ""} to commit:
          </p>
          {changedFiles.map((file) => (
            <div
              key={file}
              className="rounded-md bg-muted px-3 py-1.5 text-sm text-foreground font-mono"
              data-testid={`publish-file-${file}`}
            >
              {file}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Each file will be committed separately. This will trigger a deploy.
        </p>

        <div className="flex gap-2">
          <AdminButton
            variant="primary"
            size="sm"
            onClick={executePublish}
            data-testid="publish-confirm-button"
          >
            Confirm publish
          </AdminButton>
          <AdminButton variant="secondary" size="sm" onClick={onClose} data-testid="publish-cancel-button">
            Cancel
          </AdminButton>
        </div>
      </div>
    );
  }

  // Publishing: show progress
  if (state === "publishing") {
    return (
      <div className="space-y-4 rounded-lg border border-border p-4" data-testid="publish-panel">
        <h3 className="text-lg font-semibold text-foreground">Publishing...</h3>

        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-muted-foreground" data-testid="publish-progress">
            Commit {currentIndex + 1}/{changedFiles.length}...
          </p>
        </div>

        <div className="space-y-1" data-testid="publish-commit-results">
          {commitResults.map((result) => (
            <div key={result.path} className="flex items-center gap-2 text-sm">
              <span>
                {result.status === "committed" && <span className="text-green-600 dark:text-green-400">&#x2714;</span>}
                {result.status === "pending" && <span className="text-muted-foreground">&#x25CB;</span>}
                {result.status === "error" && <span className="text-red-600 dark:text-red-400">&#x2716;</span>}
              </span>
              <span className="font-mono text-foreground">{result.path}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Done: success message
  if (state === "done") {
    return (
      <div className="space-y-4 rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-700 dark:bg-green-950" data-testid="publish-panel">
        <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">Published!</h3>
        <p className="text-sm text-green-700 dark:text-green-300" data-testid="publish-success">
          {commitResults.filter((r) => r.status === "committed").length} file{commitResults.filter((r) => r.status === "committed").length !== 1 ? "s" : ""} committed. Deploy triggered.
        </p>
        <div className="space-y-1" data-testid="publish-commit-results">
          {commitResults.map((result) => (
            <div key={result.path} className="flex items-center gap-2 text-sm">
              <span className="text-green-600 dark:text-green-400">&#x2714;</span>
              <span className="font-mono text-foreground">{result.path}</span>
            </div>
          ))}
        </div>
        <AdminButton variant="secondary" size="sm" onClick={onClose} data-testid="publish-close-button">
          Close
        </AdminButton>
      </div>
    );
  }

  // Error: partial publish
  if (state === "error") {
    const committed = commitResults.filter((r) => r.status === "committed");
    const failed = commitResults.filter((r) => r.status === "error");
    const pending = commitResults.filter((r) => r.status === "pending");

    return (
      <div className="space-y-4 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-950" data-testid="publish-panel">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Publish Error</h3>
        <p className="text-sm text-red-700 dark:text-red-300" data-testid="publish-error">
          {publishError}
        </p>

        <div className="space-y-1" data-testid="publish-commit-results">
          {commitResults.map((result) => (
            <div key={result.path} className="flex items-center gap-2 text-sm">
              <span>
                {result.status === "committed" && <span className="text-green-600 dark:text-green-400">&#x2714;</span>}
                {result.status === "pending" && <span className="text-muted-foreground">&#x25CB;</span>}
                {result.status === "error" && <span className="text-red-600 dark:text-red-400">&#x2716;</span>}
              </span>
              <span className="font-mono text-foreground">{result.path}</span>
              {result.error && (
                <span className="text-xs text-red-500">{result.error}</span>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          {committed.length} committed, {failed.length} failed, {pending.length} skipped.
        </p>

        <AdminButton variant="secondary" size="sm" onClick={onClose} data-testid="publish-close-button">
          Close
        </AdminButton>
      </div>
    );
  }

  return null;
}
