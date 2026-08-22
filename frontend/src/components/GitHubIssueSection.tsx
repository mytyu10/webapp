import { useState } from 'react';
import { startGitHubOAuth } from '../api/githubApi';
import type { GitHubIssue } from '../api/githubApi';
import SectionToggleButton from './SectionToggleButton';
import FormErrorBanner from './FormErrorBanner';
import { logger } from '../logger';

const CONTEXT = 'GitHubIssueSection';

interface GitHubIssueSectionProps {
  /** GitHub と連携済みかどうか */
  connected: boolean;
  /** 取得した Issue 一覧 */
  issues: GitHubIssue[];
  /** ローディング中かどうか */
  loading: boolean;
  /** エラーメッセージ */
  error: string | null;
}

/**
 * タスク一覧ページの GitHub Issues セクションコンポーネント
 * 未連携時は連携ボタンを表示し、連携済み時は Issue 一覧をリスト表示する
 */
function GitHubIssueSection({
  connected,
  issues,
  loading,
  error,
}: GitHubIssueSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState('');

  async function handleConnect(): Promise<void> {
    setOauthLoading(true);
    setOauthError('');
    try {
      await startGitHubOAuth();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'GitHub連携の開始に失敗しました。';
      logger.warn(CONTEXT, `GitHub OAuth開始失敗: ${message}`);
      setOauthError(message);
      setOauthLoading(false);
    }
  }

  if (!connected) {
    return (
      <div className="mt-8">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
          GitHub Issues
        </p>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-5 text-center">
          <p className="text-slate-400 text-sm mb-4">
            GitHub と連携するとタスク一覧に Issues を表示できます。
          </p>
          <FormErrorBanner message={oauthError} />
          <button
            type="button"
            onClick={() => void handleConnect()}
            disabled={oauthLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-slate-100 text-sm font-medium hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <SectionToggleButton
        label="GitHub Issues"
        count={issues.length}
        isOpen={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      />

      <FormErrorBanner message={error ?? ''} />

      {loading && (
        <p className="text-slate-400 text-sm">読み込み中...</p>
      )}

      {!loading && isOpen && (
        <>
          {issues.length === 0 && !error && (
            <p className="text-slate-400 text-sm">
              オープンな Issue はありません。
              <a
                href="/profile"
                className="ml-1 text-sky-400 hover:text-sky-300 underline"
              >
                プロフィールページ
              </a>
              でリポジトリを追加してください。
            </p>
          )}

          {issues.length > 0 && (
            <div className="space-y-2">
              {issues.map((issue) => (
                <a
                  key={`${issue.owner}/${issue.repo}#${issue.number}`}
                  href={issue.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 hover:border-slate-500 hover:bg-slate-750 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-100 text-sm font-medium truncate group-hover:text-white">
                        {issue.title}
                      </p>
                      <p className="text-slate-500 text-xs mt-1">
                        {issue.owner}/{issue.repo} #{issue.number}
                        {' '}
                        <span className="ml-1">@{issue.user_login}</span>
                      </p>
                    </div>
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300 border border-emerald-700">
                      open
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default GitHubIssueSection;
