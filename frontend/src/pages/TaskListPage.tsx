import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskList, TaskTreeNode } from '../hooks/useTaskList';
import { useIsMobile } from '../hooks/useIsMobile';
import { useGitHubIssues } from '../hooks/useGitHubIssues';
import { getCurrentUsername, Task } from '../api/taskApi';
import FormErrorBanner from '../components/FormErrorBanner';
import ConfirmModal from '../components/ConfirmModal';
import TaskCard from '../components/TaskCard';
import ActionButton from '../components/ActionButton';
import CategoryFilterBar from '../components/CategoryFilterBar';
import SectionToggleButton from '../components/SectionToggleButton';
import TaskDetailPanel from '../components/TaskDetailPanel';
import GitHubIssueSection from '../components/GitHubIssueSection';

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
 * tasks ツリーから指定 ID のタスクを再帰的に探して返す
 */
function findTaskById(tasks: Task[], id: number): Task | undefined {
  for (const task of tasks) {
    if (task.id === id) return task;
    if (task.children.length > 0) {
      const found = findTaskById(task.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * タスク一覧ページ
 * タスクの一覧表示・カテゴリフィルタリング・削除・作成・編集・詳細表示を提供する。
 * 削除・編集ボタンは詳細サイドパネル内に配置する。削除は作成者のみ表示する。
 * 未完了タスクと完了済みタスクをセクションで分けて表示する（完了済みは折りたたみ可）。
 * 親子タスクは階層インデントで表示する。
 * タスクカードをクリックすると右側のサイドパネルにタスク詳細を表示する（ページ遷移なし）。
 * 一覧と詳細は useTaskList の同一 tasks ステートを共有する。
 * スマホ（640px未満）では詳細パネルが全画面表示になり一覧を隠す。
 * GitHub Issues セクションを既存タスクセクションの下に表示する。
 */
function TaskListPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    tasks,
    incompleteTrees,
    completedTrees,
    categories,
    selectedCategory,
    loading,
    error,
    toggleCompleteError,
    togglingIds,
    handleDelete,
    handleUpdate,
    handleToggleComplete,
    awaitToggle,
    setSelectedCategory,
  } = useTaskList();

  const {
    issues,
    connected: githubConnected,
    loading: githubLoading,
    error: githubError,
  } = useGitHubIssues();

  const [deleteError, setDeleteError] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isCompletedSectionOpen, setIsCompletedSectionOpen] = useState(true);

  /** 折りたたまれている親タスク ID のセット（セット内にあれば折りたたみ状態） */
  const [collapsedParentIds, setCollapsedParentIds] = useState<Set<number>>(new Set());

  /** 詳細サイドパネルに表示中のタスクID。null のとき非表示 */
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const currentUsername = getCurrentUsername();

  /** 詳細パネルに表示するタスク（useTaskList の tasks から取得して一覧と同じデータを共有） */
  const selectedTask = selectedTaskId !== null ? (findTaskById(tasks, selectedTaskId) ?? null) : null;

  /** 詳細パネルで表示中のタスクが現在ユーザーの作成物かどうか */
  const isDetailOwner =
    selectedTask !== null && currentUsername !== null && selectedTask.created_by === currentUsername;

  /** 詳細パネルで表示中のタスクが PATCH 処理中かどうか */
  const isDetailToggling = selectedTaskId !== null && togglingIds.has(selectedTaskId);

  /** パネル幅（px）。ドラッグで変更され画面更新でリセットされる */
  const [panelWidth, setPanelWidth] = useState(320);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    function onMouseMove(e: MouseEvent): void {
      if (!isDraggingRef.current || !containerRef.current) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      setPanelWidth(Math.max(240, Math.min(700, rect.right - e.clientX)));
    }
    function onMouseUp(): void {
      isDraggingRef.current = false;
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  function handleDividerMouseDown(e: React.MouseEvent): void {
    e.preventDefault();
    isDraggingRef.current = true;
  }

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
   * React state（togglingIds）の更新遅延に依存せずここで直接呼ぶ。
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
    const indentClass = DEPTH_INDENT_CLASSES[node.depth] ?? DEPTH_INDENT_FALLBACK_CLASS;

    return (
      <div className={indentClass}>
        <TaskCard
          node={node}
          isCollapsed={collapsedParentIds.has(node.id)}
          onToggleCollapse={() => toggleCollapse(node.id)}
          onSelect={() => void openDetailPanel(node.id)}
        />
      </div>
    );
  }

  const hasAnyTask = incompleteTrees.length > 0 || completedTrees.length > 0;
  const isPanelOpen = selectedTaskId !== null;

  /**
   * スマホ時は詳細パネルが全画面を占有するため一覧エリアを非表示にする。
   * PC時はパネルが開いていても一覧と横並びで表示する。
   */
  const shouldHideList = isMobile && isPanelOpen;

  return (
    <div className={`flex ${isPanelOpen ? 'items-start' : ''}`} ref={containerRef}>
      {/* タスク一覧エリア（スマホでパネルが開いているときは非表示） */}
      <div className={`${isPanelOpen ? 'flex-1 min-w-0' : 'w-full'} ${shouldHideList ? 'hidden' : ''}`}>
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

        {/* GitHub Issues セクション */}
        <GitHubIssueSection
          connected={githubConnected}
          issues={issues}
          loading={githubLoading}
          error={githubError}
        />
      </div>

      {/* リサイズ可能なディバイダー＋詳細パネル */}
      {isPanelOpen && (
        <>
          {/* ドラッグリサイザーはスマホでは非表示 */}
          {!isMobile && (
            <div
              onMouseDown={handleDividerMouseDown}
              className="w-3 self-stretch cursor-col-resize shrink-0 flex items-stretch justify-center group"
            >
              <div className="w-px bg-slate-700 group-hover:bg-sky-500 transition-colors" />
            </div>
          )}
          {/* スマホ時は全画面、PC時は固定幅 */}
          <div
            style={isMobile ? undefined : { width: panelWidth }}
            className={isMobile ? 'w-full' : 'shrink-0'}
          >
            <TaskDetailPanel
              task={selectedTask}
              isToggling={isDetailToggling}
              isOwner={isDetailOwner}
              isMobile={isMobile}
              onClose={closeDetailPanel}
              onToggleComplete={handleToggleComplete}
              onSelectTask={(id) => setSelectedTaskId(id)}
              onDeleteClick={onDeleteClick}
              onUpdate={handleUpdate}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default TaskListPage;
