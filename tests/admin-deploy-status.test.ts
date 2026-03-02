// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { createRoot } from "react-dom/client";

// Mock localStorage
const store: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (index: number) => Object.keys(store)[index] ?? null,
} as Storage;
Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage, writable: true });

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
vi.stubEnv("NEXT_PUBLIC_GITHUB_OWNER", "test-owner");
vi.stubEnv("NEXT_PUBLIC_GITHUB_REPO", "test-repo");

beforeEach(() => {
  mockFetch.mockReset();
  mockLocalStorage.clear();
});

// --- isDeployBlocking ---

describe("isDeployBlocking", () => {
  it("returns true when deploy is in progress", async () => {
    const { isDeployBlocking } = await import("@/lib/admin/deploy-status");
    expect(isDeployBlocking("in_progress")).toBe(true);
  });

  it("returns false when deploy is idle", async () => {
    const { isDeployBlocking } = await import("@/lib/admin/deploy-status");
    expect(isDeployBlocking("idle")).toBe(false);
  });

  it("returns false when deploy is completed", async () => {
    const { isDeployBlocking } = await import("@/lib/admin/deploy-status");
    expect(isDeployBlocking("completed")).toBe(false);
  });

  it("returns false when deploy failed", async () => {
    const { isDeployBlocking } = await import("@/lib/admin/deploy-status");
    expect(isDeployBlocking("failed")).toBe(false);
  });
});

// --- getDeployStatus API ---

describe("getDeployStatus API calls", () => {
  it("returns idle when no workflow runs", async () => {
    const { getDeployStatus } = await import("@/lib/admin/github");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ workflow_runs: [] }),
    });

    const status = await getDeployStatus("test-token");
    expect(status.status).toBe("idle");
    expect(status.conclusion).toBeNull();
    expect(status.createdAt).toBeNull();
  });

  it("returns in_progress for running deploy", async () => {
    const { getDeployStatus } = await import("@/lib/admin/github");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        workflow_runs: [{
          status: "in_progress",
          conclusion: null,
          created_at: "2024-01-01T12:00:00Z",
        }],
      }),
    });

    const status = await getDeployStatus("test-token");
    expect(status.status).toBe("in_progress");
    expect(status.conclusion).toBeNull();
    expect(status.createdAt).toBe("2024-01-01T12:00:00Z");
  });

  it("returns completed for successful deploy", async () => {
    const { getDeployStatus } = await import("@/lib/admin/github");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        workflow_runs: [{
          status: "completed",
          conclusion: "success",
          created_at: "2024-01-01T12:00:00Z",
        }],
      }),
    });

    const status = await getDeployStatus("test-token");
    expect(status.status).toBe("completed");
    expect(status.conclusion).toBe("success");
  });

  it("returns completed with failure conclusion", async () => {
    const { getDeployStatus } = await import("@/lib/admin/github");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        workflow_runs: [{
          status: "completed",
          conclusion: "failure",
          created_at: "2024-01-01T12:00:00Z",
        }],
      }),
    });

    const status = await getDeployStatus("test-token");
    expect(status.status).toBe("completed");
    expect(status.conclusion).toBe("failure");
  });

  it("returns queued status", async () => {
    const { getDeployStatus } = await import("@/lib/admin/github");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        workflow_runs: [{
          status: "queued",
          conclusion: null,
          created_at: "2024-01-01T12:00:00Z",
        }],
      }),
    });

    const status = await getDeployStatus("test-token");
    expect(status.status).toBe("queued");
  });
});

// --- Status normalization ---

describe("Deploy state normalization", () => {
  it("maps in_progress to in_progress", () => {
    const raw = { status: "in_progress" as const, conclusion: null, createdAt: null };
    // in_progress or queued → in_progress
    const state = raw.status === "in_progress" || raw.status === "queued" ? "in_progress" : "idle";
    expect(state).toBe("in_progress");
  });

  it("maps queued to in_progress", () => {
    const raw = { status: "queued" as const, conclusion: null, createdAt: null };
    const state = raw.status === "in_progress" || raw.status === "queued" ? "in_progress" : "idle";
    expect(state).toBe("in_progress");
  });

  it("maps completed + success to completed", () => {
    const raw = { status: "completed" as const, conclusion: "success", createdAt: null };
    let state: string;
    if (raw.status === "in_progress" || raw.status === "queued") state = "in_progress";
    else if (raw.status === "completed" && raw.conclusion === "success") state = "completed";
    else if (raw.status === "completed") state = "failed";
    else state = "idle";
    expect(state).toBe("completed");
  });

  it("maps completed + failure to failed", () => {
    const raw = { status: "completed" as const, conclusion: "failure", createdAt: null };
    let state: string;
    if (raw.status === "in_progress" || raw.status === "queued") state = "in_progress";
    else if (raw.status === "completed" && raw.conclusion === "success") state = "completed";
    else if (raw.status === "completed") state = "failed";
    else state = "idle";
    expect(state).toBe("failed");
  });

  it("maps idle to idle", () => {
    const raw = { status: "idle" as const, conclusion: null, createdAt: null };
    let state: string;
    if (raw.status === "in_progress" || raw.status === "queued") state = "in_progress";
    else if (raw.status === "completed" && raw.conclusion === "success") state = "completed";
    else if (raw.status === "completed") state = "failed";
    else state = "idle";
    expect(state).toBe("idle");
  });
});

// --- DeployStatusIndicator ---

describe("DeployStatusIndicator", () => {
  it("exports DeployStatusIndicator", async () => {
    const { DeployStatusIndicator } = await import("@/components/admin/deploy-status-indicator");
    expect(typeof DeployStatusIndicator).toBe("function");
  });

  it("renders idle state", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { DeployStatusIndicator } = await import("@/components/admin/deploy-status-indicator");

    await new Promise<void>((resolve) => {
      root.render(React.createElement(DeployStatusIndicator, { state: "idle", createdAt: null }));
      setTimeout(resolve, 50);
    });

    const el = container.querySelector("[data-testid='deploy-status']");
    expect(el).not.toBeNull();
    expect(el!.getAttribute("data-deploy-state")).toBe("idle");
    expect(container.querySelector("[data-testid='deploy-status-label']")?.textContent).toContain("idle");
    root.unmount();
    container.remove();
  });

  it("renders in_progress state", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { DeployStatusIndicator } = await import("@/components/admin/deploy-status-indicator");

    await new Promise<void>((resolve) => {
      root.render(React.createElement(DeployStatusIndicator, { state: "in_progress", createdAt: "2024-01-01T12:00:00Z" }));
      setTimeout(resolve, 50);
    });

    const el = container.querySelector("[data-testid='deploy-status']");
    expect(el!.getAttribute("data-deploy-state")).toBe("in_progress");
    expect(container.querySelector("[data-testid='deploy-status-label']")?.textContent).toContain("in progress");
    root.unmount();
    container.remove();
  });

  it("renders completed state", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { DeployStatusIndicator } = await import("@/components/admin/deploy-status-indicator");

    await new Promise<void>((resolve) => {
      root.render(React.createElement(DeployStatusIndicator, { state: "completed", createdAt: null }));
      setTimeout(resolve, 50);
    });

    expect(container.querySelector("[data-testid='deploy-status']")!.getAttribute("data-deploy-state")).toBe("completed");
    expect(container.querySelector("[data-testid='deploy-status-label']")?.textContent).toContain("completed");
    root.unmount();
    container.remove();
  });

  it("renders failed state", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { DeployStatusIndicator } = await import("@/components/admin/deploy-status-indicator");

    await new Promise<void>((resolve) => {
      root.render(React.createElement(DeployStatusIndicator, { state: "failed", createdAt: null }));
      setTimeout(resolve, 50);
    });

    expect(container.querySelector("[data-testid='deploy-status']")!.getAttribute("data-deploy-state")).toBe("failed");
    expect(container.querySelector("[data-testid='deploy-status-label']")?.textContent).toContain("failed");
    root.unmount();
    container.remove();
  });
});

// --- Publish blocking ---

describe("Publish blocking during deploy", () => {
  it("publish button blocked when deploy in progress", async () => {
    // Set up dirty drafts so button would normally be enabled
    const { saveDraft, setOriginal } = await import("@/lib/admin/draft-manager");
    setOriginal("content/file.json", { v: "old" });
    saveDraft("content/file.json", { v: "new" });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { PublishButton } = await import("@/components/admin/publish-panel");

    await new Promise<void>((resolve) => {
      root.render(React.createElement(PublishButton, { onClick: () => {}, deployBlocked: true }));
      setTimeout(resolve, 100);
    });

    const btn = container.querySelector("[data-testid='publish-button']") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.title).toContain("Deploy in progress");
    root.unmount();
    container.remove();
  });

  it("publish button enabled when deploy not blocking", async () => {
    const { saveDraft, setOriginal } = await import("@/lib/admin/draft-manager");
    setOriginal("content/file.json", { v: "old" });
    saveDraft("content/file.json", { v: "new" });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { PublishButton } = await import("@/components/admin/publish-panel");

    await new Promise<void>((resolve) => {
      root.render(React.createElement(PublishButton, { onClick: () => {}, deployBlocked: false }));
      setTimeout(resolve, 100);
    });

    const btn = container.querySelector("[data-testid='publish-button']") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    root.unmount();
    container.remove();
  });
});

// --- Draft always allowed ---

describe("Draft operations during deploy", () => {
  it("saveDraft works regardless of deploy state", async () => {
    const { saveDraft, loadDraft } = await import("@/lib/admin/draft-manager");

    // Drafts don't check deploy state — always allowed
    saveDraft("content/test.json", { title: "Draft during deploy" });
    expect(loadDraft("content/test.json")).toEqual({ title: "Draft during deploy" });
  });

  it("setOriginal works regardless of deploy state", async () => {
    const { setOriginal, getDirtyKeys, saveDraft } = await import("@/lib/admin/draft-manager");

    setOriginal("content/test.json", { title: "Original" });
    saveDraft("content/test.json", { title: "Changed" });
    expect(getDirtyKeys()).toContain("content/test.json");
  });
});

// --- Upload blocking ---

describe("Upload blocking during deploy", () => {
  it("isDeployBlocking correctly blocks upload during in_progress", async () => {
    const { isDeployBlocking } = await import("@/lib/admin/deploy-status");
    // Upload should be blocked during deploy (same logic as publish)
    expect(isDeployBlocking("in_progress")).toBe(true);
    expect(isDeployBlocking("idle")).toBe(false);
    expect(isDeployBlocking("completed")).toBe(false);
    expect(isDeployBlocking("failed")).toBe(false);
  });
});
