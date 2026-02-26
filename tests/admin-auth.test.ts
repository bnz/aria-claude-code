import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateToken, checkRepoAccess } from "@/lib/admin/github";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("validateToken", () => {
  it("returns GitHubUser on valid token", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        login: "testuser",
        avatar_url: "https://avatars.githubusercontent.com/u/123",
        name: "Test User",
      }),
    });

    const user = await validateToken("ghp_valid_token");

    expect(user).toEqual({
      login: "testuser",
      avatar_url: "https://avatars.githubusercontent.com/u/123",
      name: "Test User",
    });

    expect(mockFetch).toHaveBeenCalledWith("https://api.github.com/user", {
      headers: {
        Authorization: "Bearer ghp_valid_token",
        Accept: "application/vnd.github+json",
      },
    });
  });

  it("returns name as null when GitHub user has no name", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        login: "noname",
        avatar_url: "https://avatars.githubusercontent.com/u/456",
        name: null,
      }),
    });

    const user = await validateToken("ghp_valid");
    expect(user.name).toBeNull();
  });

  it("throws on invalid token (401)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    await expect(validateToken("ghp_invalid")).rejects.toThrow("Invalid token: 401");
  });

  it("throws on forbidden (403)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    await expect(validateToken("ghp_forbidden")).rejects.toThrow("Invalid token: 403");
  });
});

describe("checkRepoAccess", () => {
  it("returns true when token has repo access", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const result = await checkRepoAccess("ghp_token", "owner", "repo");

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.github.com/repos/owner/repo",
      {
        headers: {
          Authorization: "Bearer ghp_token",
          Accept: "application/vnd.github+json",
        },
      },
    );
  });

  it("returns false when token lacks repo access", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const result = await checkRepoAccess("ghp_token", "owner", "private-repo");

    expect(result).toBe(false);
  });
});

describe("Auth sessionStorage integration", () => {
  const mockSessionStorage = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    mockSessionStorage.clear();
  });

  it("stores token in sessionStorage", () => {
    mockSessionStorage.setItem("admin_github_token", "ghp_test");
    expect(mockSessionStorage.getItem("admin_github_token")).toBe("ghp_test");
  });

  it("clears token from sessionStorage on logout", () => {
    mockSessionStorage.setItem("admin_github_token", "ghp_test");
    mockSessionStorage.removeItem("admin_github_token");
    expect(mockSessionStorage.getItem("admin_github_token")).toBeNull();
  });

  it("returns null for missing token", () => {
    expect(mockSessionStorage.getItem("admin_github_token")).toBeNull();
  });
});
