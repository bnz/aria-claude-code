import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getRepoConfig,
  fetchFile,
  commitFile,
  uploadImage,
  listFiles,
  getDeployStatus,
} from "@/lib/admin/github";
import { createContentManager } from "@/lib/admin/content-manager";
import { TranslationsSchema } from "@/schemas";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubEnv("NEXT_PUBLIC_GITHUB_OWNER", "test-owner");
  vi.stubEnv("NEXT_PUBLIC_GITHUB_REPO", "test-repo");
});

// --- getRepoConfig ---

describe("getRepoConfig", () => {
  it("returns owner and repo from env vars", () => {
    const config = getRepoConfig();
    expect(config).toEqual({ owner: "test-owner", repo: "test-repo" });
  });

  it("throws if NEXT_PUBLIC_GITHUB_OWNER is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_GITHUB_OWNER", "");
    expect(() => getRepoConfig()).toThrow("Missing NEXT_PUBLIC_GITHUB_OWNER");
  });

  it("throws if NEXT_PUBLIC_GITHUB_REPO is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_GITHUB_REPO", "");
    expect(() => getRepoConfig()).toThrow("Missing NEXT_PUBLIC_GITHUB_OWNER");
  });
});

// --- fetchFile ---

describe("fetchFile", () => {
  it("returns decoded content and sha on success", async () => {
    const jsonContent = JSON.stringify({ hello: "world" });
    const base64Content = btoa(jsonContent);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: base64Content,
        sha: "abc123sha",
      }),
    });

    const result = await fetchFile("ghp_token", "content/test.json");

    expect(result.content).toBe(jsonContent);
    expect(result.sha).toBe("abc123sha");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/test-owner/test-repo/contents/content/test.json",
      {
        headers: {
          Authorization: "Bearer ghp_token",
          Accept: "application/vnd.github+json",
        },
      },
    );
  });

  it("handles Base64 content with newlines", async () => {
    const jsonContent = JSON.stringify({ key: "value" });
    const base64WithNewlines = btoa(jsonContent).match(/.{1,20}/g)!.join("\n");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: base64WithNewlines,
        sha: "sha456",
      }),
    });

    const result = await fetchFile("ghp_token", "content/test.json");
    expect(result.content).toBe(jsonContent);
  });

  it("throws on 404 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(fetchFile("ghp_token", "content/missing.json")).rejects.toThrow(
      'Failed to fetch file "content/missing.json": 404',
    );
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(fetchFile("ghp_token", "content/error.json")).rejects.toThrow(
      'Failed to fetch file "content/error.json": 500',
    );
  });
});

// --- commitFile ---

describe("commitFile", () => {
  it("sends correct PUT request with Base64 content and sha", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: { sha: "new-sha-123" },
      }),
    });

    const result = await commitFile(
      "ghp_token",
      "content/test.json",
      '{"key":"value"}',
      "Update test.json",
      "old-sha-456",
    );

    expect(result).toBe("new-sha-123");

    const call = mockFetch.mock.calls[0];
    expect(call[0]).toBe(
      "https://api.github.com/repos/test-owner/test-repo/contents/content/test.json",
    );
    expect(call[1].method).toBe("PUT");

    const body = JSON.parse(call[1].body);
    expect(body.message).toBe("Update test.json");
    expect(body.sha).toBe("old-sha-456");
    expect(atob(body.content)).toBe('{"key":"value"}');
  });

  it("creates new file when sha is omitted", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: { sha: "created-sha" },
      }),
    });

    await commitFile(
      "ghp_token",
      "content/new.json",
      '{"new":true}',
      "Create new.json",
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.sha).toBeUndefined();
  });

  it("throws on error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
    });

    await expect(
      commitFile("ghp_token", "content/test.json", "{}", "msg", "sha"),
    ).rejects.toThrow('Failed to commit file "content/test.json": 409');
  });
});

// --- uploadImage ---

describe("uploadImage", () => {
  it("sends Base64 content directly with correct commit message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: { sha: "img-sha-789" },
      }),
    });

    const base64ImageData = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwC";
    const result = await uploadImage(
      "ghp_token",
      "public/media/photo.png",
      base64ImageData,
      "Upload photo.png",
    );

    expect(result).toBe("img-sha-789");

    const call = mockFetch.mock.calls[0];
    expect(call[0]).toBe(
      "https://api.github.com/repos/test-owner/test-repo/contents/public/media/photo.png",
    );
    expect(call[1].method).toBe("PUT");

    const body = JSON.parse(call[1].body);
    expect(body.content).toBe(base64ImageData);
    expect(body.message).toBe("Upload photo.png");
  });

  it("throws on error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
    });

    await expect(
      uploadImage("ghp_token", "public/media/bad.png", "data", "Upload"),
    ).rejects.toThrow('Failed to upload image "public/media/bad.png": 422');
  });
});

// --- listFiles ---

describe("listFiles", () => {
  it("returns entries array", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { name: "index.json", path: "content/articles/index.json", type: "file", sha: "sha1" },
        { name: "back-pain", path: "content/conditions/back-pain", type: "dir", sha: "sha2" },
      ],
    });

    const result = await listFiles("ghp_token", "content/articles");

    expect(result).toEqual([
      { name: "index.json", path: "content/articles/index.json", type: "file", sha: "sha1" },
      { name: "back-pain", path: "content/conditions/back-pain", type: "dir", sha: "sha2" },
    ]);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/test-owner/test-repo/contents/content/articles",
      {
        headers: {
          Authorization: "Bearer ghp_token",
          Accept: "application/vnd.github+json",
        },
      },
    );
  });

  it("handles empty directory", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const result = await listFiles("ghp_token", "content/empty");
    expect(result).toEqual([]);
  });

  it("throws on error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(listFiles("ghp_token", "content/nonexistent")).rejects.toThrow(
      'Failed to list files in "content/nonexistent": 404',
    );
  });
});

// --- getDeployStatus ---

describe("getDeployStatus", () => {
  it("returns latest run status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        workflow_runs: [
          {
            status: "completed",
            conclusion: "success",
            created_at: "2024-01-15T10:00:00Z",
          },
        ],
      }),
    });

    const result = await getDeployStatus("ghp_token");

    expect(result).toEqual({
      status: "completed",
      conclusion: "success",
      createdAt: "2024-01-15T10:00:00Z",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/test-owner/test-repo/actions/runs?per_page=1",
      {
        headers: {
          Authorization: "Bearer ghp_token",
          Accept: "application/vnd.github+json",
        },
      },
    );
  });

  it("returns in_progress status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        workflow_runs: [
          {
            status: "in_progress",
            conclusion: null,
            created_at: "2024-01-15T10:05:00Z",
          },
        ],
      }),
    });

    const result = await getDeployStatus("ghp_token");
    expect(result.status).toBe("in_progress");
    expect(result.conclusion).toBeNull();
  });

  it("returns idle when no runs found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        workflow_runs: [],
      }),
    });

    const result = await getDeployStatus("ghp_token");

    expect(result).toEqual({
      status: "idle",
      conclusion: null,
      createdAt: null,
    });
  });

  it("throws on error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    await expect(getDeployStatus("ghp_token")).rejects.toThrow(
      "Failed to get deploy status: 403",
    );
  });
});

// --- Content Manager ---

describe("createContentManager", () => {
  function mockFetchFileResponse(content: Record<string, unknown>, sha: string) {
    const jsonStr = JSON.stringify(content);
    const base64 = btoa(jsonStr);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: base64, sha }),
    });
  }

  describe("loadFile", () => {
    it("validates with Zod and returns data + sha", async () => {
      const translationData = {
        id: "tr-en",
        updatedAt: "2024-01-01T00:00:00Z",
        header: { home: "Home" },
        footer: { copyright: "2024" },
        buttons: { submit: "Submit" },
      };

      mockFetchFileResponse(translationData, "tr-sha-123");

      const cm = createContentManager("ghp_token");
      const result = await cm.loadFile("content/translations.en.json", TranslationsSchema);

      expect(result.data).toEqual(translationData);
      expect(result.sha).toBe("tr-sha-123");
    });

    it("throws on invalid JSON", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: btoa("not valid json{{{"),
          sha: "bad-json-sha",
        }),
      });

      const cm = createContentManager("ghp_token");
      await expect(
        cm.loadFile("content/bad.json", TranslationsSchema),
      ).rejects.toThrow('Invalid JSON in file "content/bad.json"');
    });

    it("throws on Zod validation failure", async () => {
      const invalidData = {
        // missing required "id" field
        updatedAt: "not-a-datetime",
      };

      mockFetchFileResponse(invalidData, "invalid-sha");

      const cm = createContentManager("ghp_token");
      await expect(
        cm.loadFile("content/translations.en.json", TranslationsSchema),
      ).rejects.toThrow('Validation failed for "content/translations.en.json"');
    });
  });

  describe("getSha", () => {
    it("returns cached sha after load", async () => {
      const data = {
        id: "tr-lv",
        updatedAt: "2024-01-01T00:00:00Z",
        header: {},
        footer: {},
        buttons: {},
      };

      mockFetchFileResponse(data, "cached-sha-456");

      const cm = createContentManager("ghp_token");
      await cm.loadFile("content/translations.lv.json", TranslationsSchema);

      expect(cm.getSha("content/translations.lv.json")).toBe("cached-sha-456");
    });

    it("returns undefined for files not yet loaded", () => {
      const cm = createContentManager("ghp_token");
      expect(cm.getSha("content/unknown.json")).toBeUndefined();
    });
  });

  describe("invalidateCache", () => {
    it("clears specific path cache", async () => {
      const data = {
        id: "tr-ru",
        updatedAt: "2024-01-01T00:00:00Z",
        header: {},
        footer: {},
        buttons: {},
      };

      mockFetchFileResponse(data, "ru-sha");

      const cm = createContentManager("ghp_token");
      await cm.loadFile("content/translations.ru.json", TranslationsSchema);

      expect(cm.getSha("content/translations.ru.json")).toBe("ru-sha");

      cm.invalidateCache("content/translations.ru.json");
      expect(cm.getSha("content/translations.ru.json")).toBeUndefined();
    });

    it("clears all cache when called without path", async () => {
      const data1 = {
        id: "tr-en",
        updatedAt: "2024-01-01T00:00:00Z",
        header: {},
        footer: {},
        buttons: {},
      };
      const data2 = {
        id: "tr-lv",
        updatedAt: "2024-01-01T00:00:00Z",
        header: {},
        footer: {},
        buttons: {},
      };

      mockFetchFileResponse(data1, "sha-en");
      mockFetchFileResponse(data2, "sha-lv");

      const cm = createContentManager("ghp_token");
      await cm.loadFile("content/translations.en.json", TranslationsSchema);
      await cm.loadFile("content/translations.lv.json", TranslationsSchema);

      expect(cm.getSha("content/translations.en.json")).toBe("sha-en");
      expect(cm.getSha("content/translations.lv.json")).toBe("sha-lv");

      cm.invalidateCache();
      expect(cm.getSha("content/translations.en.json")).toBeUndefined();
      expect(cm.getSha("content/translations.lv.json")).toBeUndefined();
    });
  });

  describe("typed loaders", () => {
    it("loadTranslations fetches correct path", async () => {
      const data = {
        id: "tr-en",
        updatedAt: "2024-01-01T00:00:00Z",
        header: { nav: "Nav" },
        footer: {},
        buttons: {},
      };

      mockFetchFileResponse(data, "sha-tr");

      const cm = createContentManager("ghp_token");
      const result = await cm.loadTranslations("en");

      expect(result.id).toBe("tr-en");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("content/translations.en.json"),
        expect.anything(),
      );
    });

    it("loadArticle fetches correct path with slug and lang", async () => {
      const data = {
        id: "art-1",
        slug: "stress",
        updatedAt: "2024-01-01T00:00:00Z",
        seo: { title: "Stress", description: "About stress relief" },
        title: "Acupuncture for Stress",
        excerpt: "Learn about stress relief",
        sections: [{ type: "text", content: "Body text here" }],
      };

      mockFetchFileResponse(data, "sha-art");

      const cm = createContentManager("ghp_token");
      const result = await cm.loadArticle("stress", "en");

      expect(result.slug).toBe("stress");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("content/articles/stress/article.en.json"),
        expect.anything(),
      );
    });

    it("loadCondition fetches correct path with slug and lang", async () => {
      const data = {
        id: "cond-1",
        slug: "back-pain",
        updatedAt: "2024-01-01T00:00:00Z",
        seo: { title: "Back Pain", description: "Treatment for back pain" },
        title: "Back Pain Treatment",
        intro: "Back pain introduction",
        sections: [{ type: "text", content: "Treatment details" }],
      };

      mockFetchFileResponse(data, "sha-cond");

      const cm = createContentManager("ghp_token");
      const result = await cm.loadCondition("back-pain", "lv");

      expect(result.slug).toBe("back-pain");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("content/conditions/back-pain/condition.lv.json"),
        expect.anything(),
      );
    });
  });
});
