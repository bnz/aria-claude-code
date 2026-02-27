const GITHUB_API_BASE = "https://api.github.com";

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
}

export interface RepoConfig {
  owner: string;
  repo: string;
}

export interface GitHubFileContent {
  content: string;
  sha: string;
}

export interface GitHubFileEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  sha: string;
}

export interface DeployStatus {
  status: "completed" | "in_progress" | "queued" | "idle";
  conclusion: string | null;
  createdAt: string | null;
}

/**
 * Read GitHub owner/repo from environment variables.
 * Throws if either is missing.
 */
export function getRepoConfig(): RepoConfig {
  const owner = process.env.NEXT_PUBLIC_GITHUB_OWNER;
  const repo = process.env.NEXT_PUBLIC_GITHUB_REPO;
  if (!owner || !repo) {
    throw new Error(
      "Missing NEXT_PUBLIC_GITHUB_OWNER or NEXT_PUBLIC_GITHUB_REPO environment variables",
    );
  }
  return { owner, repo };
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

/**
 * Fetch a file's content and SHA from the repository.
 * Decodes Base64 content from the GitHub API response.
 */
export async function fetchFile(
  token: string,
  path: string,
): Promise<GitHubFileContent> {
  const { owner, repo } = getRepoConfig();
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch file "${path}": ${response.status}`);
  }

  const data = await response.json();
  const decoded = atob(data.content.replace(/\n/g, ""));
  return { content: decoded, sha: data.sha };
}

/**
 * Create or update a file in the repository via a commit.
 * Pass `sha` when updating an existing file (prevents conflicts).
 * Omit `sha` when creating a new file.
 * Returns the new file SHA.
 */
export async function commitFile(
  token: string,
  path: string,
  content: string,
  message: string,
  sha?: string,
): Promise<string> {
  const { owner, repo } = getRepoConfig();
  const encoded = btoa(unescape(encodeURIComponent(content)));

  const body: Record<string, string> = { message, content: encoded };
  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to commit file "${path}": ${response.status}`);
  }

  const data = await response.json();
  return data.content.sha;
}

/**
 * Upload a binary image file to the repository.
 * Content should already be Base64-encoded (e.g. from FileReader.readAsDataURL).
 * Each image upload creates a separate commit per spec.
 */
export async function uploadImage(
  token: string,
  path: string,
  base64Content: string,
  message: string,
): Promise<string> {
  const { owner, repo } = getRepoConfig();

  const body: Record<string, string> = {
    message,
    content: base64Content,
  };

  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to upload image "${path}": ${response.status}`);
  }

  const data = await response.json();
  return data.content.sha;
}

/**
 * List files and directories at a given path in the repository.
 */
export async function listFiles(
  token: string,
  dirPath: string,
): Promise<GitHubFileEntry[]> {
  const { owner, repo } = getRepoConfig();
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${dirPath}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to list files in "${dirPath}": ${response.status}`,
    );
  }

  const data = await response.json();
  const entries: unknown[] = Array.isArray(data) ? data : [];
  return entries.map((entry: unknown) => {
    const e = entry as Record<string, unknown>;
    return {
      name: e.name as string,
      path: e.path as string,
      type: e.type as "file" | "dir",
      sha: e.sha as string,
    };
  });
}

/**
 * Get the latest GitHub Actions deploy status for the repository.
 * Returns "idle" status if no workflow runs are found.
 */
export async function getDeployStatus(token: string): Promise<DeployStatus> {
  const { owner, repo } = getRepoConfig();
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs?per_page=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to get deploy status: ${response.status}`);
  }

  const data = await response.json();
  const runs = data.workflow_runs as Record<string, unknown>[] | undefined;

  if (!runs || runs.length === 0) {
    return { status: "idle", conclusion: null, createdAt: null };
  }

  const latest = runs[0];
  return {
    status: latest.status as DeployStatus["status"],
    conclusion: (latest.conclusion as string) ?? null,
    createdAt: (latest.created_at as string) ?? null,
  };
}
