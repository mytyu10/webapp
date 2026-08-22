import { logger } from '../logger';

const { REACT_APP_API_SCHEME, REACT_APP_API_HOST, REACT_APP_API_PORT } = process.env;
const API_BASE = REACT_APP_API_HOST
  ? `${REACT_APP_API_SCHEME}://${REACT_APP_API_HOST}:${REACT_APP_API_PORT}`
  : '';
const CONTEXT = 'githubApi';

/** 認証ヘッダーを取得する */
function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token') ?? '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

/** 連携リポジトリ */
export interface GitHubRepo {
  id: number;
  owner: string;
  repo: string;
}

/** GitHub Issue */
export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  owner: string;
  repo: string;
  created_at: string;
  updated_at: string;
  user_login: string;
}

/**
 * GitHub OAuth 認可 URL を取得してリダイレクトする
 */
export async function startGitHubOAuth(): Promise<void> {
  logger.info(CONTEXT, 'GitHub OAuth 開始');

  const response = await fetch(`${API_BASE}/github/oauth/start`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('GitHub OAuthの開始に失敗しました。');
  }

  const data = (await response.json()) as { url: string };
  window.location.href = data.url;
}

/**
 * GitHub 連携状態を取得する
 */
export async function fetchGitHubStatus(): Promise<boolean> {
  logger.info(CONTEXT, 'GitHub 連携状態取得');

  const response = await fetch(`${API_BASE}/github/status`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('GitHub連携状態の取得に失敗しました。');
  }

  const data = (await response.json()) as { connected: boolean };
  return data.connected;
}

/**
 * 連携リポジトリ一覧を取得する
 */
export async function fetchGitHubRepos(): Promise<GitHubRepo[]> {
  logger.info(CONTEXT, 'リポジトリ一覧取得');

  const response = await fetch(`${API_BASE}/github/repos`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('リポジトリ一覧の取得に失敗しました。');
  }

  return (await response.json()) as GitHubRepo[];
}

/**
 * 連携リポジトリを追加する
 */
export async function addGitHubRepo(owner: string, repo: string): Promise<GitHubRepo> {
  logger.info(CONTEXT, `リポジトリ追加: ${owner}/${repo}`);

  const response = await fetch(`${API_BASE}/github/repos`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ owner, repo }),
  });

  if (!response.ok) {
    const data = (await response.json()) as { message?: string };
    throw new Error(data.message ?? 'リポジトリの追加に失敗しました。');
  }

  const data = (await response.json()) as { repo: GitHubRepo };
  return data.repo;
}

/**
 * 連携リポジトリを削除する
 */
export async function deleteGitHubRepo(id: number): Promise<void> {
  logger.info(CONTEXT, `リポジトリ削除: id=${id}`);

  const response = await fetch(`${API_BASE}/github/repos/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = (await response.json()) as { message?: string };
    throw new Error(data.message ?? 'リポジトリの削除に失敗しました。');
  }
}

/**
 * 全連携リポジトリの GitHub Issue を取得する
 */
export async function fetchGitHubIssues(): Promise<GitHubIssue[]> {
  logger.info(CONTEXT, 'GitHub Issue 一覧取得');

  const response = await fetch(`${API_BASE}/github/issues`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error('GitHub Issueの取得に失敗しました。');
  }

  return (await response.json()) as GitHubIssue[];
}
