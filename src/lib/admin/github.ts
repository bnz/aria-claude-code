const GITHUB_API_BASE = "https://api.github.com";

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
}

/**
 * Validate a GitHub Personal Access Token by calling the /user endpoint.
 * Returns the authenticated user on success, throws on failure.
 */
export async function validateToken(token: string): Promise<GitHubUser> {
  const response = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(`Invalid token: ${response.status}`);
  }

  const data = await response.json();
  return {
    login: data.login,
    avatar_url: data.avatar_url,
    name: data.name ?? null,
  };
}

/**
 * Check if the token has access to a specific repository.
 */
export async function checkRepoAccess(
  token: string,
  owner: string,
  repo: string,
): Promise<boolean> {
  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  return response.ok;
}
