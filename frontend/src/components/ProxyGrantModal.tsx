import { useState, useEffect } from 'react';
import {
  ProxyGrantUser,
  fetchProxyGrantees,
  addProxyGrant,
  deleteProxyGrant,
} from '../api/eventApi';
import { fetchAllUsers } from '../api/chatApi';
import { logger } from '../logger';

const CONTEXT = 'ProxyGrantModal';

/** ProxyGrantModal のProps型 */
interface ProxyGrantModalProps {
  /** ログイン中ユーザー名 */
  currentUsername: string | null;
  /** モーダルを閉じるコールバック */
  onClose: () => void;
}

/**
 * 代理登録権限管理モーダルコンポーネント。
 * 自分の予定に代理登録できるユーザーを追加・削除する。
 * 代理登録を許可したユーザーは自分の名前で予定を作成できる
 */
function ProxyGrantModal({ currentUsername, onClose }: ProxyGrantModalProps) {
  const [grantees, setGrantees] = useState<ProxyGrantUser[]>([]);
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [selectedUsername, setSelectedUsername] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [removingUsername, setRemovingUsername] = useState<string | null>(null);
  const [addError, setAddError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const [granteesData, usersData] = await Promise.all([
          fetchProxyGrantees(),
          fetchAllUsers(),
        ]);
        setGrantees(granteesData);
        setAllUsers(usersData.map((u) => u.username));
      } catch (err) {
        logger.warn(CONTEXT, `データ取得失敗: ${err instanceof Error ? err.message : '不明なエラー'}`);
        setLoadError('データの取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** 既に代理登録権限が付与されているユーザーと自分自身を除外したユーザー一覧 */
  const grantedUsernames = new Set(grantees.map((g) => g.username));
  const availableUsers = allUsers.filter(
    (u) => u !== currentUsername && !grantedUsernames.has(u),
  );

  async function handleAdd(): Promise<void> {
    if (!selectedUsername) {
      setAddError('ユーザーを選択してください。');
      return;
    }
    setAddError('');
    setIsAdding(true);
    try {
      const granted = await addProxyGrant(selectedUsername);
      setGrantees((prev) => [...prev, granted]);
      setSelectedUsername('');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : '代理登録権限の付与に失敗しました。');
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemove(username: string): Promise<void> {
    setRemovingUsername(username);
    try {
      await deleteProxyGrant(username);
      setGrantees((prev) => prev.filter((g) => g.username !== username));
    } catch (err) {
      logger.warn(CONTEXT, `代理登録権限削除失敗: ${err instanceof Error ? err.message : '不明なエラー'}`);
    } finally {
      setRemovingUsername(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* モーダル本体 */}
      <div className="relative z-10 w-full max-w-md bg-slate-800 border border-slate-600 rounded-xl shadow-2xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-600">
          <div>
            <h2 className="text-base font-bold text-slate-100">代理登録権限の管理</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              許可したユーザーが自分の名前で予定を登録できます
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="text-slate-400 hover:text-slate-200 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          {loadError && (
            <p className="text-sm text-red-400">{loadError}</p>
          )}

          {loading ? (
            <p className="text-sm text-slate-400">読み込み中...</p>
          ) : (
            <>
              {/* 権限付与フォーム */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  代理登録を許可するユーザー
                </p>

                <div className="flex gap-2">
                  <select
                    value={selectedUsername}
                    onChange={(e) => setSelectedUsername(e.target.value)}
                    disabled={isAdding || availableUsers.length === 0}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-500 rounded-md text-sm text-slate-100 outline-none focus:border-sky-500 disabled:opacity-50"
                  >
                    <option value="">
                      {availableUsers.length === 0 ? '追加できるユーザーがいません' : 'ユーザーを選択'}
                    </option>
                    {availableUsers.map((username) => (
                      <option key={username} value={username}>
                        {username}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => void handleAdd()}
                    disabled={isAdding || !selectedUsername}
                    className="px-3 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-colors whitespace-nowrap"
                  >
                    {isAdding ? '付与中...' : '許可'}
                  </button>
                </div>

                {addError && (
                  <p className="text-xs text-red-400">{addError}</p>
                )}
              </div>

              {/* 権限付与済みユーザー一覧 */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  代理登録を許可済みのユーザー
                </p>

                {grantees.length === 0 ? (
                  <p className="text-sm text-slate-500">代理登録を許可しているユーザーはいません</p>
                ) : (
                  <div className="space-y-1.5">
                    {grantees.map((grantee) => (
                      <div
                        key={grantee.username}
                        className="flex items-center justify-between px-3 py-2 bg-slate-700 border border-slate-600 rounded-md"
                      >
                        <span className="text-sm text-slate-200">{grantee.username}</span>
                        <button
                          type="button"
                          onClick={() => void handleRemove(grantee.username)}
                          disabled={removingUsername === grantee.username}
                          className="text-red-400 hover:text-red-300 disabled:opacity-50 text-xs font-medium transition-colors"
                        >
                          {removingUsername === grantee.username ? '削除中...' : '取り消し'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* フッター */}
        <div className="px-5 py-4 border-t border-slate-600 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm font-semibold rounded-md transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProxyGrantModal;
