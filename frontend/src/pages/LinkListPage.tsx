import { useState, useCallback, useMemo } from 'react';
import { useLinkList } from '../hooks/useLinkList';
import { getCurrentUsername } from '../api/taskApi';
import { LinkItem } from '../api/linkApi';
import {
  fetchLinkPermissions,
  addLinkPermission,
  deleteLinkPermission,
  Permission,
  PermissionInput,
} from '../api/permissionApi';
import ConfirmModal from '../components/ConfirmModal';
import LinkFormModal from '../components/LinkFormModal';
import LinkTreeNode from '../components/LinkTreeNode';
import PermissionModal from '../components/PermissionModal';
import FormErrorBanner from '../components/FormErrorBanner';
import { logger } from '../logger';

const CONTEXT = 'LinkListPage';

/**
 * 全フォルダをフラットな配列として返す（ツリー構造を再帰的に展開）
 */
function collectAllFolders(items: LinkItem[]): LinkItem[] {
  const result: LinkItem[] = [];
  for (const item of items) {
    if (item.type === 'FOLDER') {
      result.push(item);
      result.push(...collectAllFolders(item.children));
    }
  }
  return result;
}

/** モーダルの種別 */
type ModalMode =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; item: LinkItem }
  | { type: 'delete'; item: LinkItem }
  | { type: 'permission'; item: LinkItem };

/**
 * リンク集一覧ページ
 * エクスプローラー風のツリー表示でフォルダ/リンクを管理する。
 * フォルダはクリックで展開/折りたたみ。リンクは別タブで開く。
 * 作成・編集はモーダルで行う。削除は作成者のみ可能。
 * 作成者は「共有」ボタンから他ユーザーに READ/WRITE 権限を付与できる
 */
function LinkListPage() {
  const { links, loading, error, expandedIds, toggleExpand, handleDelete, reload } = useLinkList();
  const [modalMode, setModalMode] = useState<ModalMode>({ type: 'none' });
  const [deleteError, setDeleteError] = useState('');
  const [permissionError, setPermissionError] = useState('');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const currentUsername = getCurrentUsername();

  /** 全フォルダの一覧（親フォルダ選択肢に使用） */
  const allFolders = useMemo(() => collectAllFolders(links), [links]);

  /**
   * 編集モーダルを開く
   */
  const handleEdit = useCallback((item: LinkItem): void => {
    setModalMode({ type: 'edit', item });
  }, []);

  /**
   * 削除確認モーダルを開く
   */
  const handleDeleteClick = useCallback((item: LinkItem): void => {
    setDeleteError('');
    setModalMode({ type: 'delete', item });
  }, []);

  /**
   * 共有モーダルを開く（権限一覧を取得してから表示する）
   */
  const handleShareClick = useCallback(async (item: LinkItem): Promise<void> => {
    setPermissionError('');
    try {
      const perms = await fetchLinkPermissions(item.id);
      setPermissions(perms);
      setModalMode({ type: 'permission', item });
    } catch (err) {
      logger.warn(CONTEXT, `権限一覧取得失敗: ${err instanceof Error ? err.message : '不明なエラー'}`);
      setPermissionError('権限一覧の取得に失敗しました。');
    }
  }, []);

  /**
   * 削除を実行する
   */
  async function handleDeleteConfirm(): Promise<void> {
    if (modalMode.type !== 'delete') return;
    try {
      await handleDelete(modalMode.item.id);
      setModalMode({ type: 'none' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'リンクの削除に失敗しました。';
      setDeleteError(message);
    }
  }

  /**
   * 権限を付与してローカルステートを更新する
   */
  async function handleAddPermission(input: PermissionInput): Promise<void> {
    if (modalMode.type !== 'permission') return;
    const added = await addLinkPermission(modalMode.item.id, input);
    setPermissions((prev) => {
      const filtered = prev.filter((p) => p.username !== added.username);
      return [...filtered, added];
    });
  }

  /**
   * 権限を削除してローカルステートを更新する
   */
  async function handleRemovePermission(username: string): Promise<void> {
    if (modalMode.type !== 'permission') return;
    await deleteLinkPermission(modalMode.item.id, username);
    setPermissions((prev) => prev.filter((p) => p.username !== username));
  }

  /**
   * モーダルを閉じる
   */
  function handleModalClose(): void {
    setModalMode({ type: 'none' });
  }

  /**
   * 作成・編集成功時の処理
   */
  function handleFormSuccess(): void {
    setModalMode({ type: 'none' });
    reload();
  }

  /** 削除対象アイテム */
  const deleteTarget = modalMode.type === 'delete' ? modalMode.item : null;

  /** フォルダ削除時の警告メッセージ */
  const deleteMessage =
    deleteTarget?.type === 'FOLDER'
      ? `「${deleteTarget.title}」を削除しますか？このフォルダ配下の全リンク・フォルダもすべて削除されます。`
      : `「${deleteTarget?.title ?? ''}」を削除しますか？`;

  return (
    <div className="p-4 sm:p-6 text-slate-100">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-100">リンク集</h1>
        <button
          type="button"
          onClick={() => setModalMode({ type: 'create' })}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-md transition-colors"
        >
          + 追加
        </button>
      </div>

      <FormErrorBanner message={deleteError} />
      <FormErrorBanner message={permissionError} />

      {/* ローディング */}
      {loading && (
        <p className="text-slate-400 text-sm">読み込み中...</p>
      )}

      {/* エラー */}
      {!loading && error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* 空状態 */}
      {!loading && !error && links.length === 0 && (
        <div className="text-center py-16">
          <p className="text-slate-400 text-sm mb-2">リンクがまだありません</p>
          <p className="text-slate-500 text-xs">「+ 追加」ボタンからリンクやフォルダを追加できます</p>
        </div>
      )}

      {/* ツリー表示 */}
      {!loading && !error && links.length > 0 && (
        <ul className="space-y-0.5">
          {links.map((item) => (
            <LinkTreeNode
              key={item.id}
              item={item}
              depth={0}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onShare={(item) => { void handleShareClick(item); }}
              currentUsername={currentUsername}
            />
          ))}
        </ul>
      )}

      {/* 作成・編集モーダル */}
      {(modalMode.type === 'create' || modalMode.type === 'edit') && (
        <LinkFormModal
          editItem={modalMode.type === 'edit' ? modalMode.item : undefined}
          folders={allFolders}
          onClose={handleModalClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* 削除確認モーダル */}
      <ConfirmModal
        open={modalMode.type === 'delete'}
        title="削除の確認"
        message={deleteMessage}
        confirmLabel="削除する"
        onConfirm={() => { void handleDeleteConfirm(); }}
        onCancel={handleModalClose}
      />

      {/* 権限共有モーダル */}
      {modalMode.type === 'permission' && (
        <PermissionModal
          title={`「${modalMode.item.title}」の共有設定`}
          permissions={permissions}
          onAdd={handleAddPermission}
          onRemove={handleRemovePermission}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}

export default LinkListPage;
