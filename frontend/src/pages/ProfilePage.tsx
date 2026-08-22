import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMe } from '../hooks/useMe';
import { updateMe } from '../api/accountApi';
import {
  startGitHubOAuth,
  fetchGitHubStatus,
  fetchGitHubRepos,
  addGitHubRepo,
  deleteGitHubRepo,
  type GitHubRepo,
} from '../api/githubApi';
import { logger } from '../logger';

const CONTEXT = 'ProfilePage';
const DISPLAY_NAME_MAX = 20;

/**
 * プロフィールページ
 * ログインユーザーの display_name を表示・編集できる。
 * GitHub 連携・連携リポジトリ管理も提供する。
 */
function ProfilePage() {
  const { me, loading, refetch } = useMe();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- 表示名 ---
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // --- GitHub 連携 ---
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);
  const [githubLoading, setGithubLoading] = useState(true);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [githubError, setGithubError] = useState('');
  const [githubSuccess, setGithubSuccess] = useState('');

  // --- リポジトリ追加フォーム ---
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [addingRepo, setAddingRepo] = useState(false);
  const [repoError, setRepoError] = useState('');

  // me が取得できたら入力欄の初期値をセット
  useEffect(() => {
    if (me) {
      setDisplayName(me.display_name ?? '');
    }
  }, [me]);

  // GitHub 連携状態・リポジトリ一覧を取得する
  useEffect(() => {
    async function loadGitHub(): Promise<void> {
      setGithubLoading(true);
      try {
        const connected = await fetchGitHubStatus();
        setGithubConnected(connected);
        if (connected) {
          const repos = await fetchGitHubRepos();
          setGithubRepos(repos);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'GitHub情報の取得に失敗しました。';
        logger.warn(CONTEXT, `GitHub情報取得失敗: ${message}`);
        setGithubError(message);
      } finally {
        setGithubLoading(false);
      }
    }
    void loadGitHub();
  }, []);

  // OAuth コールバック結果をクエリパラメータから検出する
  useEffect(() => {
    const github = searchParams.get('github');
    if (github === 'success') {
      setGithubSuccess('GitHub との連携が完了しました。');
      setGithubConnected(true);
      // リポジトリ一覧を再取得する
      void fetchGitHubRepos()
        .then((repos) => setGithubRepos(repos))
        .catch(() => {});
      setSearchParams({}, { replace: true });
    } else if (github === 'error') {
      setGithubError('GitHub との連携に失敗しました。もう一度お試しください。');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setProfileSuccess('');
    setProfileError('');
    setSaving(true);

    try {
      const trimmed = displayName.trim();
      await updateMe(trimmed === '' ? null : trimmed);
      logger.info(CONTEXT, 'プロフィール更新成功');
      setProfileSuccess('プロフィールを更新しました。');
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'プロフィールの更新に失敗しました。';
      logger.warn(CONTEXT, `プロフィール更新失敗: ${message}`);
      setProfileError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleGitHubConnect(): Promise<void> {
    setOauthLoading(true);
    setGithubError('');
    try {
      await startGitHubOAuth();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'GitHub連携の開始に失敗しました。';
      logger.warn(CONTEXT, `GitHub OAuth開始失敗: ${message}`);
      setGithubError(message);
      setOauthLoading(false);
    }
  }

  async function handleAddRepo(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const owner = repoOwner.trim();
    const repo = repoName.trim();

    if (!owner || !repo) {
      setRepoError('オーナー名とリポジトリ名を入力してください。');
      return;
    }

    setAddingRepo(true);
    setRepoError('');

    try {
      const added = await addGitHubRepo(owner, repo);
      setGithubRepos((prev) => [...prev, added]);
      setRepoOwner('');
      setRepoName('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'リポジトリの追加に失敗しました。';
      logger.warn(CONTEXT, `リポジトリ追加失敗: ${message}`);
      setRepoError(message);
    } finally {
      setAddingRepo(false);
    }
  }

  async function handleDeleteRepo(id: number): Promise<void> {
    try {
      await deleteGitHubRepo(id);
      setGithubRepos((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'リポジトリの削除に失敗しました。';
      logger.warn(CONTEXT, `リポジトリ削除失敗: ${message}`);
      setGithubError(message);
    }
  }

  const isProfileValid = displayName.trim().length <= DISPLAY_NAME_MAX;

  return (
    <div className="max-w-lg mx-auto mt-12 px-4 pb-12 space-y-6">

      {/* プロフィールカード */}
      <div className="bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700">
        <h1 className="text-2xl font-bold text-slate-100 mb-2">プロフィール</h1>
        <p className="text-slate-400 text-sm mb-6">
          表示名を設定するとサイドバーやチャットに反映されます。
        </p>

        {/* ユーザー名（変更不可） */}
        <div className="mb-6 p-4 bg-slate-700 rounded-lg">
          <p className="text-slate-300 text-sm">
            <span className="text-slate-500">ユーザー名：</span>
            <span className="font-medium text-slate-100">
              {loading ? '...' : me?.username ?? ''}
            </span>
          </p>
        </div>

        {/* 表示名編集フォーム */}
        <form onSubmit={(e) => void handleSave(e)} noValidate>
          <div className="mb-5">
            <label
              htmlFor="display-name"
              className="block text-sm font-medium text-slate-300 mb-1"
            >
              表示名
              <span className="ml-1 text-slate-500 font-normal">
                （最大{DISPLAY_NAME_MAX}文字・空欄で削除）
              </span>
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setProfileSuccess('');
                setProfileError('');
              }}
              maxLength={DISPLAY_NAME_MAX}
              placeholder="例：山田 太郎"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500 text-right">
              {displayName.trim().length} / {DISPLAY_NAME_MAX}
            </p>
          </div>

          {profileError && (
            <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg">
              <p className="text-red-300 text-sm">{profileError}</p>
            </div>
          )}

          {profileSuccess && (
            <div className="mb-4 p-3 bg-emerald-900/40 border border-emerald-700 rounded-lg">
              <p className="text-emerald-300 text-sm">{profileSuccess}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !isProfileValid || loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                保存中...
              </>
            ) : (
              '保存する'
            )}
          </button>
        </form>
      </div>

      {/* GitHub 連携カード */}
      <div className="bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700">
        <h2 className="text-xl font-bold text-slate-100 mb-2">GitHub 連携</h2>
        <p className="text-slate-400 text-sm mb-6">
          連携するとタスク一覧画面に GitHub Issues を表示できます。
        </p>

        {githubSuccess && (
          <div className="mb-4 p-3 bg-emerald-900/40 border border-emerald-700 rounded-lg">
            <p className="text-emerald-300 text-sm">{githubSuccess}</p>
          </div>
        )}

        {githubError && (
          <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm">{githubError}</p>
          </div>
        )}

        {githubLoading ? (
          <p className="text-slate-400 text-sm">読み込み中...</p>
        ) : !githubConnected ? (
          /* 未連携状態 */
          <button
            type="button"
            onClick={() => void handleGitHubConnect()}
            disabled={oauthLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-slate-700 text-slate-100 font-medium hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {oauthLoading ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                連携中...
              </>
            ) : (
              'GitHub と連携する'
            )}
          </button>
        ) : (
          /* 連携済み状態 */
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300 border border-emerald-700 text-xs font-medium">
                連携済み
              </span>
              <button
                type="button"
                onClick={() => void handleGitHubConnect()}
                disabled={oauthLoading}
                className="text-xs text-sky-400 hover:text-sky-300 underline disabled:opacity-50"
              >
                再連携する
              </button>
            </div>

            {/* リポジトリ一覧 */}
            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">
                連携リポジトリ
              </p>
              {githubRepos.length === 0 ? (
                <p className="text-slate-400 text-sm">
                  リポジトリが追加されていません。
                </p>
              ) : (
                <ul className="space-y-2">
                  {githubRepos.map((repo) => (
                    <li
                      key={repo.id}
                      className="flex items-center justify-between bg-slate-700 rounded-lg px-3 py-2"
                    >
                      <span className="text-slate-100 text-sm font-mono">
                        {repo.owner}/{repo.repo}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleDeleteRepo(repo.id)}
                        className="text-slate-400 hover:text-red-400 text-xs transition-colors ml-3 shrink-0"
                      >
                        削除
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* リポジトリ追加フォーム */}
            <form onSubmit={(e) => void handleAddRepo(e)} noValidate>
              <p className="text-sm font-medium text-slate-300 mb-2">
                リポジトリを追加
              </p>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  value={repoOwner}
                  onChange={(e) => {
                    setRepoOwner(e.target.value);
                    setRepoError('');
                  }}
                  placeholder="owner"
                  className="flex-1 min-w-0 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                />
                <span className="self-center text-slate-400">/</span>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => {
                    setRepoName(e.target.value);
                    setRepoError('');
                  }}
                  placeholder="repo"
                  className="flex-1 min-w-0 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                />
                <button
                  type="submit"
                  disabled={addingRepo}
                  className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  {addingRepo ? '追加中...' : '追加'}
                </button>
              </div>

              {repoError && (
                <p className="mt-2 text-red-400 text-xs">{repoError}</p>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
