import { useState, useEffect, useCallback } from 'react';
import {
  fetchGitHubIssues,
  fetchGitHubRepos,
  fetchGitHubStatus,
  addGitHubRepo,
  deleteGitHubRepo,
  type GitHubIssue,
  type GitHubRepo,
} from '../api/githubApi';
import { logger } from '../logger';

const CONTEXT = 'useGitHubIssues';

interface UseGitHubIssuesResult {
  /** 取得した Issue 一覧 */
  issues: GitHubIssue[];
  /** 連携済みリポジトリ一覧 */
  repos: GitHubRepo[];
  /** GitHub と連携済みかどうか */
  connected: boolean;
  /** ローディング中かどうか */
  loading: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** リポジトリを追加する */
  addRepo: (owner: string, repo: string) => Promise<void>;
  /** リポジトリを削除する */
  removeRepo: (id: number) => Promise<void>;
  /** Issue を再取得する */
  refetchIssues: () => Promise<void>;
}

/**
 * GitHub Issues 取得・リポジトリ管理フック
 * マウント時に連携状態・リポジトリ一覧・Issue 一覧を取得する
 */
export function useGitHubIssues(): UseGitHubIssuesResult {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const isConnected = await fetchGitHubStatus();
      setConnected(isConnected);

      if (!isConnected) {
        setRepos([]);
        setIssues([]);
        return;
      }

      const [repoList, issueList] = await Promise.all([
        fetchGitHubRepos(),
        fetchGitHubIssues(),
      ]);

      setRepos(repoList);
      setIssues(issueList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'GitHub情報の取得に失敗しました。';
      logger.warn(CONTEXT, `GitHub情報取得失敗: ${message}`);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetchIssues = useCallback(async () => {
    if (!connected) return;
    try {
      const issueList = await fetchGitHubIssues();
      setIssues(issueList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'GitHub Issueの取得に失敗しました。';
      logger.warn(CONTEXT, `Issue取得失敗: ${message}`);
      setError(message);
    }
  }, [connected]);

  const addRepo = useCallback(async (owner: string, repo: string) => {
    const added = await addGitHubRepo(owner, repo);
    setRepos((prev) => [...prev, added]);
    // リポジトリ追加後に Issue を再取得する
    try {
      const issueList = await fetchGitHubIssues();
      setIssues(issueList);
    } catch {
      // Issue 取得失敗は無視（リポジトリ追加自体は成功）
    }
  }, []);

  const removeRepo = useCallback(async (id: number) => {
    await deleteGitHubRepo(id);
    setRepos((prev) => prev.filter((r) => r.id !== id));
    // リポジトリ削除後に Issue を再取得する
    try {
      const issueList = await fetchGitHubIssues();
      setIssues(issueList);
    } catch {
      // Issue 取得失敗は無視
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  return { issues, repos, connected, loading, error, addRepo, removeRepo, refetchIssues };
}
