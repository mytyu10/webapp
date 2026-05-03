import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskList, TaskTreeNode } from '../hooks/useTaskList';
import { getCurrentUsername, PRIORITY_LABELS, PRIORITY_BADGE_CLASSES } from '../api/taskApi';
import FormErrorBanner from '../components/FormErrorBanner';
import ConfirmModal from '../components/ConfirmModal';

/** depthに対応するTailwind paddingLeftクラス */
const DEPTH_INDENT_CLASSES: Record<number, string> = {
  0: 'pl-0',
  1: 'pl-5',
  2: 'pl-10',
};

/** タスクカードの完了状態別ボーダー・背景クラス */
const CARD_COMPLETED_CLASSES = 'border-green-800 opacity-75';
const CARD_PARTIAL_CLASSES = 'border-yellow-700 bg-yellow-950';
const CARD_DEFAULT_CLASSES = 'border-slate-600';

/** 「一部完了」バッジのTailwindクラス */
const PARTIAL_COMPLETE_BADGE_CLASSES = 'shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-800 text-yellow-200';

/** トグルボタン・スペーサーの幅クラス */
const TOGGLE_BUTTON_WIDTH_CLASS = 'w-6';

/** DEPTH_INDENT_CLASSES に存在しない depth のフォールバックインデントクラス */
const DEPTH_INDENT_FALLBACK_CLASS = 'pl-14';

/** ツリーノードの最大階層深さ（これを超える再帰は打ち切る） */
const MAX_TREE_DEPTH = 10;

/**
 * 指定ノードが折りたたみ状態により非表示となるか判定する。
 * 祖先タスク ID のいずれかが collapsedParentIds に含まれれば非表示とする。
 */
function isNodeHidden(
  node: TaskTreeNode,
  allNodes: TaskTreeNode[],
  collapsed: Set<number>,
  recursionDepth: number = 0,
): boolean {
  if (node.depth === 0 || recursionDepth >= MAX_TREE_DEPTH) return false;
  if (node.parent_id !== null && collapsed.has(node.parent_id)) return true;
  const parent = allNodes.find((n) => n.id === node.parent_id);
  if (!parent) return false;
  return isNodeHidden(parent, allNodes, collapsed, recursionDepth + 1);
}

/**
 * タスク一覧ページ
 * タスクの一覧表示・カテゴリフィルタリング・削除・作成・編集・詳細遷移を提供する
 * 編集・削除ボタンはタスク作成者のみ表示する
 * 未完了タスクと完了済みタスクをセクションで分けて表示する（完了済みは折りたたみ可）
 * 親子タスクは階層インデントで表示する
 * 子タスクを持つ親タスクはトグルボタンで子タスクの表示/非表示を切り替えられる
 */
function TaskListPage() {
  const navigate = useNavigate();
  const {
    incompleteTrees,
    completedTrees,
    categories,
    selectedCategory,
    loading,
    error,
    toggleCompleteError,
    handleDelete,
    handleToggleComplete,
    setSelectedCategory,
  } = useTaskList();

  const [deleteError, setDeleteError] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isCompletedSectionOpen, setIsCompletedSectionOpen] = useState(true);

  /** 折りたたまれている親タスク ID のセット（セット内にあれば折りたたみ状態） */
  const [collapsedParentIds, setCollapsedParentIds] = useState<Set<number>>(new Set());

  const currentUsername = getCurrentUsername();

  /**
   * 削除確認モーダルを開く
   */
  function onDeleteClick(id: number): void {
    setDeleteTargetId(id);
  }

  /**
   * 削除確認後にタスク削除を実行する
   */
  async function onConfirmDelete(): Promise<void> {
    if (deleteTargetId === null) return;
    setDeleteError('');
    try {
      await handleDelete(deleteTargetId);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'タスクの削除に失敗しました。');
    } finally {
      setDeleteTargetId(null);
    }
  }

  /**
   * 削除確認モーダルをキャンセルする
   */
  function onCancelDelete(): void {
    setDeleteTargetId(null);
  }

  /**
   * 指定 ID の親タスクの子タスク表示/非表示を切り替える
   */
  function toggleCollapse(parentId: number): void {
    setCollapsedParentIds((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) {
        next.delete(parentId);
      } else {
        next.add(parentId);
      }
      return next;
    });
  }

  /**
   * タスクカードを1件分レンダリングする
   * depth === 0 の場合は子タスクトグルボタン（または同幅スペーサー）を左端に表示する
   * depth > 0 の場合は既存のインデント・「└」アイコン付き構造を維持する
   */
  function renderTaskCard(node: TaskTreeNode): React.ReactElement {
    const isOwner = currentUsername !== null && node.created_by === currentUsername;
    const indentClass = DEPTH_INDENT_CLASSES[node.depth] ?? DEPTH_INDENT_FALLBACK_CLASS;

    const isCompleted = Boolean(node.is_completed);
    const cardStateClass = isCompleted
      ? CARD_COMPLETED_CLASSES
      : node.hasPartiallyCompletedChildren
        ? CARD_PARTIAL_CLASSES
        : CARD_DEFAULT_CLASSES;

    // カードのコンテンツ部分（タイトル・バッジ・説明・期限・担当者・アクションボタン）
    const cardContent = (
      <div
        className={`bg-slate-700 border rounded-lg p-5 ${cardStateClass} ${node.depth > 0 ? 'border-l-2 border-l-slate-500' : ''}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {node.depth > 0 && (
                <span className="shrink-0 text-xs text-slate-500">└</span>
              )}
              <h2 className={`text-base font-semibold text-slate-100 truncate ${isCompleted ? 'line-through opacity-60' : ''}`}>
                {node.title}
              </h2>
              <span
                className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${PRIORITY_BADGE_CLASSES[node.priority]}`}
              >
                {PRIORITY_LABELS[node.priority]}
              </span>
              {node.hasPartiallyCompletedChildren && (
                <span className={PARTIAL_COMPLETE_BADGE_CLASSES}>一部完了</span>
              )}
              {node.category && (
                <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-600 text-slate-300">
                  {node.category}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 line-clamp-2">
              {node.description}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
              <span>
                期限:{' '}
                {new Date(node.due_date).toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {node.assignees.length > 0 && (
                <span>担当者: {node.assignees.join(', ')}</span>
              )}
            </div>
          </div>

          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
            <button
              type="button"
              onClick={() => void handleToggleComplete(node.id, !isCompleted)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                isCompleted
                  ? 'text-slate-300 bg-green-700 hover:bg-green-600'
                  : 'text-slate-300 bg-slate-600 hover:bg-slate-500'
              }`}
            >
              {isCompleted ? '未完了に戻す' : '完了にする'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/tasks/${node.id}`)}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-600 hover:bg-slate-500 rounded-md transition-colors"
            >
              詳細
            </button>
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => navigate(`/tasks/${node.id}/edit`)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-600 hover:bg-slate-500 rounded-md transition-colors"
                >
                  編集
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteClick(node.id)}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-red-700 hover:bg-red-600 rounded-md transition-colors"
                >
                  削除
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );

    if (node.depth === 0) {
      const hasChildren = node.children.length > 0;
      return (
        <div className={`${indentClass} flex items-start gap-1`}>
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleCollapse(node.id)}
              aria-label="子タスクの表示切り替え"
              className={`${TOGGLE_BUTTON_WIDTH_CLASS} h-6 shrink-0 mt-5 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors`}
            >
              <span
                className={`inline-block transition-transform duration-200 text-xs ${
                  collapsedParentIds.has(node.id) ? '' : 'rotate-90'
                }`}
              >
                ＞
              </span>
            </button>
          ) : (
            <div className={`${TOGGLE_BUTTON_WIDTH_CLASS} shrink-0`} />
          )}
          <div className="flex-1">
            {cardContent}
          </div>
        </div>
      );
    }

    return (
      <div className={indentClass}>
        {cardContent}
      </div>
    );
  }

  const hasAnyTask = incompleteTrees.length > 0 || completedTrees.length > 0;

  return (
    <div>
      <ConfirmModal
        open={deleteTargetId !== null}
        title="タスクを削除"
        message="このタスクを削除してもよろしいですか？この操作は取り消せません。"
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        onConfirm={() => void onConfirmDelete()}
        onCancel={onCancelDelete}
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-100">タスク管理</h1>
        <button
          type="button"
          onClick={() => navigate('/tasks/new')}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-400 text-white text-sm font-semibold rounded-md transition-colors"
        >
          タスクを作成
        </button>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors
              ${selectedCategory === ''
                ? 'bg-sky-600 text-white'
                : 'bg-slate-600 text-slate-300 hover:bg-slate-500'}`}
          >
            すべて
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors
                ${selectedCategory === cat
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-600 text-slate-300 hover:bg-slate-500'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      <FormErrorBanner message={error || deleteError || toggleCompleteError} />

      {loading && (
        <p className="text-slate-400 text-sm">読み込み中...</p>
      )}

      {!loading && !hasAnyTask && !error && (
        <p className="text-slate-400 text-sm">タスクがありません。</p>
      )}

      {!loading && hasAnyTask && (
        <div className="space-y-6">
          {/* 未完了セクション */}
          {incompleteTrees.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                未完了 ({incompleteTrees.filter((n) => n.depth === 0).length}件)
              </p>
              <div className="space-y-2">
                {incompleteTrees
                  .filter((node) => !isNodeHidden(node, incompleteTrees, collapsedParentIds))
                  .map((node) => (
                    <div key={node.id}>{renderTaskCard(node)}</div>
                  ))}
              </div>
            </div>
          )}

          {incompleteTrees.length === 0 && !error && (
            <p className="text-slate-400 text-sm">未完了のタスクはありません。</p>
          )}

          {/* 完了済みセクション（折りたたみ） */}
          {completedTrees.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setIsCompletedSectionOpen((prev) => !prev)}
                className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wide mb-3 hover:text-slate-200 transition-colors"
              >
                <span>{isCompletedSectionOpen ? '▾' : '▸'}</span>
                <span>完了済み ({completedTrees.filter((n) => n.depth === 0).length}件)</span>
              </button>
              {isCompletedSectionOpen && (
                <div className="space-y-2">
                  {completedTrees
                    .filter((node) => !isNodeHidden(node, completedTrees, collapsedParentIds))
                    .map((node) => (
                      <div key={node.id}>{renderTaskCard(node)}</div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TaskListPage;
