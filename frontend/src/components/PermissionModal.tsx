import { useState, useEffect } from 'react';
import { fetchAllUsers } from '../api/chatApi';
import {
  Permission,
  PermissionType,
  PermissionInput,
} from '../api/permissionApi';
import { logger } from '../logger';

const CONTEXT = 'PermissionModal';

/** 権限ラベル */
const PERMISSION_LABELS: Record<PermissionType, string> = {
  READ: '閲覧のみ',
  WRITE: '編集可',
};

/** PermissionModal のProps型 */
interface PermissionModalProps {
  /** モーダルタイトル */
  title: string;
  /** 既存の権限一覧 */
  permissions: Permission[];
  /** 権限付与コールバック */
  onAdd: (input: PermissionInput) => Promise<void>;
  /** 権限削除コールバック */
  onRemove: (username: string) => Promise<void>;
  /** モーダルを閉じるコールバック */
  onClose: () => void;
}

/**
 * 権限共有モーダルコンポーネント
 * ユーザー選択 + READ/WRITE 選択で権限を付与し、既存権限を一覧・削除できる
 */
function PermissionModal({
  title,
  permissions,
  onAdd,
  onRemove,
  onClose,
}: PermissionModalProps) {
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [selectedUsername, setSelectedUsername] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<PermissionType>('READ');
  const [isAdding, setIsAdding] = useState(false);
  const [removingUsername, setRemovingUsername] = useState<string | null>(null);
  const [addError, setAddError] = useState('');
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const users = await fetchAllUsers();
        setAllUsers(users.map((u) => u.username));
      } catch (err) {
        logger.warn(CONTEXT, `ユーザー一覧取得失敗: ${err instanceof Error ? err.message : '不明なエラー'}`);
        setLoadError('ユーザー一覧の取得に失敗しました。');
      }
    })();
  }, []);

  /** 既に権限が付与されているユーザーを除外したユーザー一覧 */
  const grantedUsernames = new Set(permissions.map((p) => p.username));
  const availableUsers = allUsers.filter((u) => !grantedUsernames.has(u));

  async function handleAdd(): Promise<void> {
    if (!selectedUsername) {
      setAddError('ユーザーを選択してください。');
      return;
    }
    setAddError('');
    setIsAdding(true);
    try {
      await onAdd({ username: selectedUsername, permission: selectedPermission });
      setSelectedUsername('');
      setSelectedPermission('READ');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : '権限の付与に失敗しました。');
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemove(username: string): Promise<void> {
    setRemovingUsername(username);
    try {
      await onRemove(username);
    } catch (err) {
      logger.warn(CONTEXT, `権限削除失敗: ${err instanceof Error ? err.message : '不明なエラー'}`);
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
          <h2 className="text-base font-bold text-slate-100">{title}</h2>
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
          {/* 権限付与フォーム */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">権限を付与するユーザー</p>

            {loadError && (
              <p className="text-xs text-red-400">{loadError}</p>
            )}

            <div className="flex gap-2">
              <select
                value={selectedUsername}
                onChange={(e) => setSelectedUsername(e.target.value)}
                disabled={isAdding || availableUsers.length === 0}
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-500 rounded-md text-sm text-slate-100 outline-none focus:border-sky-500 disabled:opacity-50"
              >
                <option value="">
                  {availableUsers.length === 0 ? '付与できるユーザーがいません' : 'ユーザーを選択'}
                </option>
                {availableUsers.map((username) => (
                  <option key={username} value={username}>
                    {username}
                  </option>
                ))}
              </select>

              <select
                value={selectedPermission}
                onChange={(e) => setSelectedPermission(e.target.value as PermissionType)}
                disabled={isAdding}
                className="px-3 py-2 bg-slate-700 border border-slate-500 rounded-md text-sm text-slate-100 outline-none focus:border-sky-500 disabled:opacity-50"
              >
                <option value="READ">{PERMISSION_LABELS.READ}</option>
                <option value="WRITE">{PERMISSION_LABELS.WRITE}</option>
              </select>

              <button
                type="button"
                onClick={() => void handleAdd()}
                disabled={isAdding || !selectedUsername}
                className="px-3 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-colors whitespace-nowrap"
              >
                {isAdding ? '付与中...' : '付与'}
              </button>
            </div>

            {addError && (
              <p className="text-xs text-red-400">{addError}</p>
            )}
          </div>

          {/* 既存権限一覧 */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
              現在の権限一覧
            </p>

            {permissions.length === 0 ? (
              <p className="text-sm text-slate-500">権限が付与されたユーザーはいません</p>
            ) : (
              <div className="space-y-1.5">
                {permissions.map((perm) => (
                  <div
                    key={perm.username}
                    className="flex items-center justify-between px-3 py-2 bg-slate-700 border border-slate-600 rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-200">{perm.username}</span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          perm.permission === 'WRITE'
                            ? 'bg-sky-900 text-sky-300'
                            : 'bg-slate-600 text-slate-300'
                        }`}
                      >
                        {PERMISSION_LABELS[perm.permission]}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleRemove(perm.username)}
                      disabled={removingUsername === perm.username}
                      className="text-red-400 hover:text-red-300 disabled:opacity-50 text-xs font-medium transition-colors"
                    >
                      {removingUsername === perm.username ? '削除中...' : '削除'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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

export default PermissionModal;
