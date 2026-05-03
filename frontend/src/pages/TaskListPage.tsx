import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskList, TaskTreeNode } from '../hooks/useTaskList';
import { getCurrentUsername } from '../api/taskApi';
import FormErrorBanner from '../components/FormErrorBanner';
import ConfirmModal from '../components/ConfirmModal';
import TaskCard from '../components/TaskCard';
import ActionButton from '../components/ActionButton';
import CategoryFilterBar from '../components/CategoryFilterBar';
import SectionToggleButton from '../components/SectionToggleButton';
import TaskDetailPanel from '../components/TaskDetailPanel';

/** depthに対応するTailwind paddingLeftクラス */
const DEPTH_INDENT_CLASSES: Record<number, string> = {
  0: 'pl-0',
  1: 'pl-5',
  2: 'pl-10',
};

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
 * タスクの一覧表示・カテゴリフィルタリング・削除・作成・編集・詳細表示を提供する
 * 削除ボタンはタスク作成者のみ表示する。編集ボタンは全ユーザーに表示する
 * 未完了タスクと完了済みタスクをセクションで分けて表示する（完了済みは折りたたみ可）
 * 親子タスクは階層インデントで表示する
 * 子タスクを持つ親タスクはトグルボタンで子タスクの表示/非表示を切り替えられる
 * 「詳細」ボタン押下時は右側のサイドパネルにタスク詳細を表示する（ページ遷移なし）
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
    awaitToggle,
    setSelectedCategory,
  } = useTaskList();

  const [deleteError, setDeleteError] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isCompletedSectionOpen, setIsCompletedSectionOpen] = useState(true);

  /** 折りたたまれている親タスク ID のセット（セット内にあれば折りたたみ状態） */
  const [collapsedParentIds, setCollapsedParentIds] = useState<Set<number>>(new Set());

  /** 詳細サイドパネルに表示中のタスクID。null のとき非表示 */
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

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
      // 削除したタスクがパネルに表示中ならパネルを閉じる
      if (selectedTaskId === deleteTargetId) {
        setSelectedTaskId(null);
      }
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
   * 詳細サイドパネルを開く。
   * PATCH 進行中なら完了を待ってからパネルを表示する。
   * ref ベースの awaitToggle は常に最新状態を参照するため
   * React state（togglingIds）の更新遅延に依存せずここで直接呼ぶ
   */
  async function openDetailPanel(id: number): Promise<void> {
    await awaitToggle(id);
    setSelectedTaskId(id);
  }

  /**
   * 詳細サイドパネルを閉じる
   */
  function closeDetailPanel(): void {
    setSelectedTaskId(null);
  }

  /**
   * タスクカードを1件分レンダリングする
   * インデントクラスで階層を表現し、カード内部の表示は TaskCard コンポーネントに委譲する
   */
  function renderTaskCard(node: TaskTreeNode) {
    const isOwner = currentUsername !== null && node.created_by === currentUsername;
    const indentClass = DEPTH_INDENT_CLASSES[node.depth] ?? DEPTH_INDENT_FALLBACK_CLASS;

    return (
      <div className={indentClass}>
        <TaskCard
          node={node}
          isCollapsed={collapsedParentIds.has(node.id)}
          onToggleCollapse={() => toggleCollapse(node.id)}
          onToggleComplete={(id, is_completed) => void handleToggleComplete(id, is_completed)}
          onNavigateDetail={(id) => void openDetailPanel(id)}
          onNavigateEdit={(id) => navigate(`/tasks/${id}/edit`)}
          onDeleteClick={onDeleteClick}
          isOwner={isOwner}
        />
      </div>
    );
  }

  const hasAnyTask = incompleteTrees.length > 0 || completedTrees.length > 0;
  const isPanelOpen = selectedTaskId !== null;

  return (
    <div className={`flex gap-0 ${isPanelOpen ? 'items-start' : ''}`}>
      {/* タスク一覧エリア */}
      <div className={isPanelOpen ? 'flex-1 min-w-0' : 'w-full'}>
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
          <ActionButton label="タスクを作成" onClick={() => navigate('/tasks/new')} />
        </div>

        {categories.length > 0 && (
          <CategoryFilterBar
            categories={categories}
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
          />
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
                <SectionToggleButton
                  label="完了済み"
                  count={completedTrees.filter((n) => n.depth === 0).length}
                  isOpen={isCompletedSectionOpen}
                  onClick={() => setIsCompletedSectionOpen((prev) => !prev)}
                />
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

      {/* タスク詳細サイドパネル */}
      {isPanelOpen && (
        <TaskDetailPanel
          taskId={selectedTaskId}
          onClose={closeDetailPanel}
          onSelectTask={(id) => setSelectedTaskId(id)}
        />
      )}
    </div>
  );
}

export default TaskListPage;
