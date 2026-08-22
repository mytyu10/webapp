import { useState, useEffect } from 'react';
import { useMe } from '../hooks/useMe';
import { updateMe } from '../api/accountApi';
import { logger } from '../logger';

const CONTEXT = 'ProfilePage';
const DISPLAY_NAME_MAX = 20;

/**
 * プロフィールページ
 * ログインユーザーの display_name を表示・編集できる
 */
function ProfilePage() {
  const { me, loading, refetch } = useMe();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // me が取得できたら入力欄の初期値をセット
  useEffect(() => {
    if (me) {
      setDisplayName(me.display_name ?? '');
    }
  }, [me]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    setSaving(true);

    try {
      const trimmed = displayName.trim();
      await updateMe(trimmed === '' ? null : trimmed);
      logger.info(CONTEXT, 'プロフィール更新成功');
      setSuccessMessage('プロフィールを更新しました。');
      // サイドバーのイニシャル・表示名を更新するために再取得
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'プロフィールの更新に失敗しました。';
      logger.warn(CONTEXT, `プロフィール更新失敗: ${message}`);
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  }

  const isValid = displayName.trim().length <= DISPLAY_NAME_MAX;

  return (
    <div className="max-w-lg mx-auto mt-12 px-4">
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
        <form onSubmit={handleSave} noValidate>
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
                setSuccessMessage('');
                setErrorMessage('');
              }}
              maxLength={DISPLAY_NAME_MAX}
              placeholder="例：山田 太郎"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500 text-right">
              {displayName.trim().length} / {DISPLAY_NAME_MAX}
            </p>
          </div>

          {/* エラーメッセージ */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg">
              <p className="text-red-300 text-sm">{errorMessage}</p>
            </div>
          )}

          {/* 成功メッセージ */}
          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-900/40 border border-emerald-700 rounded-lg">
              <p className="text-emerald-300 text-sm">{successMessage}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !isValid || loading}
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
    </div>
  );
}

export default ProfilePage;
