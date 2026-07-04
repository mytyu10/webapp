import { useState, useCallback, useMemo } from 'react';
import { useLinkList } from '../hooks/useLinkList';
import { getCurrentUsername } from '../api/taskApi';
import { LinkItem } from '../api/linkApi';
import ConfirmModal from '../components/ConfirmModal';
import LinkFormModal from '../components/LinkFormModal';
import FormErrorBanner from '../components/FormErrorBanner';


/** フォルダ展開アイコン */
const ICON_FOLDER_CLOSED = '▶';
/** フォルダ折りたたみアイコン */
const ICON_FOLDER_OPEN = '▼';
/** フォルダアイコン */
const ICON_FOLDER = '📁';
/** リンクアイコン */
const ICON_LINK = '🔗';

/** 階層深さに対応するインデントクラス */
const DEPTH_INDENT_CLASSES: Record<number, string> = {
  0: 'pl-0',
  1: 'pl-6',
  2: 'pl-12',
  3: 'pl-18',
};
/** インデントフォールバッククラス */
const INDENT_FALLBACK = 'pl-24';

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
  | { type: 'delete'; item: LinkItem };

interface LinkTreeNodeProps {
  item: LinkItem;
  depth: number;
  expandedIds: Set<number>;
  onToggleExpand: (id: number) => void;
  onEdit: (item: LinkItem) => void;
  onDelete: (item: LinkItem) => void;
  currentUsername: string | null;
}

/**
 * リンクツリーの1ノードを再帰的にレンダリングするコンポーネント
 */
function LinkTreeNode({
  item,
  depth,
  expandedIds,
  onToggleExpand,
  onEdit,
  onDelete,
  currentUsername,
}: LinkTreeNodeProps) {
  const isOwner = item.created_by === currentUsername;
  const indentClass = DEPTH_INDENT_CLASSES[depth] ?? INDENT_FALLBACK;

  if (item.type === 'FOLDER') {
    const isExpanded = expandedIds.has(item.id);

    return (
      <li>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-700/60 group ${indentClass}`}
        >
          {/* 展開/折りたたみボタン */}
          <button
            type="button"
            onClick={() => onToggleExpand(item.id)}
            className="text-slate-400 hover:text-slate-200 text-xs w-4 shrink-0"
            aria-label={isExpanded ? 'フォルダを閉じる' : 'フォルダを開く'}
          >
            {isExpanded ? ICON_FOLDER_OPEN : ICON_FOLDER_CLOSED}
          </button>

          {/* フォルダ名（クリックで展開/折りたたみ） */}
          <button
            type="button"
            onClick={() => onToggleExpand(item.id)}
            className="flex items-center gap-2 flex-1 text-left text-sm font-medium text-slate-200 hover:text-white"
          >
            <span>{ICON_FOLDER}</span>
            <span>{item.title}</span>
          </button>

          {/* 操作ボタン */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-600 rounded transition-colors"
            >
              編集
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
              >
                削除
              </button>
            )}
          </div>
        </div>

        {/* 子要素（展開時のみ表示） */}
        {isExpanded && item.children.length > 0 && (
          <ul>
            {item.children.map((child) => (
              <LinkTreeNode
                key={child.id}
                item={child}
                depth={depth + 1}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                onEdit={onEdit}
                onDelete={onDelete}
                currentUsername={currentUsername}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  /** LINK タイプ */
  return (
    <li>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-700/60 group ${indentClass}`}
      >
        <span className="w-4 shrink-0 text-xs text-transparent select-none">-</span>

        {/* リンク（別タブで開く） */}
        <a
          href={item.url ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 flex-1 text-sm text-sky-400 hover:text-sky-300 hover:underline"
        >
          <span>{ICON_LINK}</span>
          <span>{item.title}</span>
          {item.description && (
            <span className="text-xs text-slate-500 ml-1">— {item.description}</span>
          )}
        </a>

        {/* 操作ボタン */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-600 rounded transition-colors"
          >
            編集
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition-colors"
            >
              削除
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * リンク集一覧ページ
 * エクスプローラー風のツリー表示でフォルダ/リンクを管理する。
 * フォルダはクリックで展開/折りたたみ。リンクは別タブで開く。
 * 作成・編集はモーダルで行う。削除は作成者のみ可能
 */
function LinkListPage() {
  const { links, loading, error, expandedIds, toggleExpand, handleDelete, reload } = useLinkList();
  const [modalMode, setModalMode] = useState<ModalMode>({ type: 'none' });
  const [deleteError, setDeleteError] = useState('');
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
    </div>
  );
}

export default LinkListPage;
