// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { createRoot, type Root } from "react-dom/client";

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

// --- MediaLibraryModal ---

describe("MediaLibraryModal", () => {
  it("exports MediaLibraryModal component", async () => {
    const { MediaLibraryModal } = await import("@/components/admin/media-library-modal");
    expect(typeof MediaLibraryModal).toBe("function");
  });

  it("renders nothing when closed", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { MediaLibraryModal } = await import("@/components/admin/media-library-modal");
    const { AdminAuthProvider } = await import("@/lib/admin/auth-context");

    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(AdminAuthProvider, null,
          React.createElement(MediaLibraryModal, {
            open: false,
            onClose: () => {},
            onSelect: () => {},
          }),
        ),
      );
      setTimeout(resolve, 50);
    });

    expect(container.querySelector("[data-testid='media-library-modal']")).toBeNull();
    root.unmount();
    container.remove();
  });
});

// --- Image filtering ---

describe("Image file filtering", () => {
  const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif"]);

  function isImageFile(name: string): boolean {
    const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
    return IMAGE_EXTENSIONS.has(ext);
  }

  it("accepts common image formats", () => {
    expect(isImageFile("photo.jpg")).toBe(true);
    expect(isImageFile("photo.jpeg")).toBe(true);
    expect(isImageFile("photo.png")).toBe(true);
    expect(isImageFile("photo.gif")).toBe(true);
    expect(isImageFile("photo.webp")).toBe(true);
    expect(isImageFile("photo.svg")).toBe(true);
    expect(isImageFile("photo.avif")).toBe(true);
  });

  it("rejects non-image files", () => {
    expect(isImageFile(".gitkeep")).toBe(false);
    expect(isImageFile("readme.md")).toBe(false);
    expect(isImageFile("data.json")).toBe(false);
    expect(isImageFile("script.js")).toBe(false);
  });

  it("is case-insensitive for extensions", () => {
    expect(isImageFile("photo.JPG")).toBe(true);
    expect(isImageFile("photo.PNG")).toBe(true);
    expect(isImageFile("photo.WebP")).toBe(true);
  });
});

// --- listFiles for media ---

describe("listFiles for media directory", () => {
  it("calls GitHub API to list media files", async () => {
    const { listFiles } = await import("@/lib/admin/github");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { name: "hero.jpg", path: "public/media/hero.jpg", type: "file", sha: "abc123" },
        { name: "cert.png", path: "public/media/cert.png", type: "file", sha: "def456" },
        { name: ".gitkeep", path: "public/media/.gitkeep", type: "file", sha: "ghi789" },
      ],
    });

    const entries = await listFiles("test-token", "public/media");
    expect(entries).toHaveLength(3);
    expect(entries[0].name).toBe("hero.jpg");
    expect(entries[1].name).toBe("cert.png");
  });

  it("handles empty media directory", async () => {
    const { listFiles } = await import("@/lib/admin/github");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const entries = await listFiles("test-token", "public/media");
    expect(entries).toHaveLength(0);
  });
});

// --- uploadImage ---

describe("uploadImage for media", () => {
  it("sends correct PUT request with base64 content", async () => {
    const { uploadImage } = await import("@/lib/admin/github");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: { sha: "new-sha-123" } }),
    });

    const sha = await uploadImage(
      "test-token",
      "public/media/new-image.jpg",
      "base64EncodedContent",
      "media: upload new-image.jpg",
    );

    expect(sha).toBe("new-sha-123");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/test-owner/test-repo/contents/public/media/new-image.jpg",
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining("base64EncodedContent"),
      }),
    );
  });

  it("throws on upload failure", async () => {
    const { uploadImage } = await import("@/lib/admin/github");
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
    });

    await expect(
      uploadImage("test-token", "public/media/fail.jpg", "data", "media: upload fail.jpg"),
    ).rejects.toThrow("Failed to upload image");
  });

  it("includes commit message in the upload", async () => {
    const { uploadImage } = await import("@/lib/admin/github");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: { sha: "sha123" } }),
    });

    await uploadImage(
      "test-token",
      "public/media/test.png",
      "base64data",
      "media: upload test.png",
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.message).toBe("media: upload test.png");
    expect(body.content).toBe("base64data");
  });
});

// --- Path conversion ---

describe("Media path conversion", () => {
  it("converts GitHub path to public path", () => {
    const githubPath = "public/media/hero.jpg";
    const publicPath = `/${githubPath.replace(/^public\//, "")}`;
    expect(publicPath).toBe("/media/hero.jpg");
  });

  it("handles nested directories", () => {
    const githubPath = "public/media/articles/photo.png";
    const publicPath = `/${githubPath.replace(/^public\//, "")}`;
    expect(publicPath).toBe("/media/articles/photo.png");
  });
});

// --- ImagePicker ---

describe("ImagePicker", () => {
  it("exports ImagePicker component", async () => {
    const { ImagePicker } = await import("@/components/admin/image-picker");
    expect(typeof ImagePicker).toBe("function");
  });

  it("renders choose button when no value", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { ImagePicker } = await import("@/components/admin/image-picker");
    const { AdminAuthProvider } = await import("@/lib/admin/auth-context");

    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(AdminAuthProvider, null,
          React.createElement(ImagePicker, {
            label: "Test Image",
            value: "",
            onChange: () => {},
            "data-testid": "test-picker",
          }),
        ),
      );
      setTimeout(resolve, 50);
    });

    const picker = container.querySelector("[data-testid='test-picker']");
    expect(picker).not.toBeNull();
    const chooseBtn = container.querySelector("[data-testid='test-picker-choose']");
    expect(chooseBtn).not.toBeNull();
    expect(chooseBtn?.textContent).toContain("Choose image");
    // No preview when no value
    const preview = container.querySelector("[data-testid='test-picker-preview']");
    expect(preview).toBeNull();

    root.unmount();
    container.remove();
  });

  it("renders preview and remove button when value exists", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { ImagePicker } = await import("@/components/admin/image-picker");
    const { AdminAuthProvider } = await import("@/lib/admin/auth-context");

    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(AdminAuthProvider, null,
          React.createElement(ImagePicker, {
            label: "Hero Image",
            value: "/media/hero.jpg",
            onChange: () => {},
            "data-testid": "hero-picker",
          }),
        ),
      );
      setTimeout(resolve, 50);
    });

    const preview = container.querySelector("[data-testid='hero-picker-preview']");
    expect(preview).not.toBeNull();
    expect(preview?.getAttribute("src")).toBe("/media/hero.jpg");

    const pathDisplay = container.querySelector("[data-testid='hero-picker-path']");
    expect(pathDisplay?.textContent).toBe("/media/hero.jpg");

    const removeBtn = container.querySelector("[data-testid='hero-picker-remove']");
    expect(removeBtn).not.toBeNull();

    root.unmount();
    container.remove();
  });

  it("calls onChange with empty string when remove is clicked", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const { ImagePicker } = await import("@/components/admin/image-picker");
    const { AdminAuthProvider } = await import("@/lib/admin/auth-context");
    const onChangeSpy = vi.fn();

    await new Promise<void>((resolve) => {
      root.render(
        React.createElement(AdminAuthProvider, null,
          React.createElement(ImagePicker, {
            label: "Image",
            value: "/media/test.jpg",
            onChange: onChangeSpy,
            "data-testid": "remove-test",
          }),
        ),
      );
      setTimeout(resolve, 50);
    });

    const removeBtn = container.querySelector("[data-testid='remove-test-remove']") as HTMLButtonElement;
    expect(removeBtn).not.toBeNull();
    removeBtn.click();

    expect(onChangeSpy).toHaveBeenCalledWith("");

    root.unmount();
    container.remove();
  });
});

// --- Base64 extraction ---

describe("Base64 extraction from data URL", () => {
  it("extracts base64 data from data URL", () => {
    const dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    const base64 = dataUrl.split(",")[1];
    expect(base64).toBe("/9j/4AAQSkZJRg==");
  });

  it("handles PNG data URL", () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgo=";
    const base64 = dataUrl.split(",")[1];
    expect(base64).toBe("iVBORw0KGgo=");
  });
});

// --- Escape key handling ---

describe("Modal escape key behavior", () => {
  it("escape key event can be detected", () => {
    const handler = vi.fn();
    document.addEventListener("keydown", handler);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].key).toBe("Escape");
    document.removeEventListener("keydown", handler);
  });
});
