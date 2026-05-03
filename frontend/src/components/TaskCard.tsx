import { TaskTreeNode } from '../hooks/useTaskList';
import { PRIORITY_LABELS, PRIORITY_BADGE_CLASSES } from '../api/taskApi';

/** トグルボタン・スペーサーの幅クラス */
const TOGGLE_BUTTON_WIDTH_CLASS = 'w-6';

/** タスクカードの完了状態別ボーダー・背景クラス */
const CARD_COMPLETED_CLASSES = 'border-green-800 opacity-75';
const CARD_PARTIAL_CLASSES = 'border-yellow-700 bg-yellow-950';
const CARD_DEFAULT_CLASSES = 'border-slate-600';

/** 「一部完了」バッジのTailwindクラス */
const PARTIAL_COMPLETE_BADGE_CLASSES =
  'shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-800 text-yellow-200';

/** TaskCard コンポーネントのProps型 */
interface TaskCardProps {
  /** 表示対象のタスクツリーノード */
  node: TaskTreeNode;
  /** 子タスクが折りたたまれているか（depth === 0 のときのみ使用） */
  isCollapsed: boolean;
  /** 子タスク表示/非表示のトグルコールバック（depth === 0 のときのみ使用） */
  onToggleCollapse: () => void;
  /** 完了状態切り替えコールバック */
  onToggleComplete: (id: number, is_completed: boolean) => void;
  /** カードクリック時に詳細パネルを開くコールバック */
  onSelect: () => void;
}

/**
 * タスクカードコンポーネント
 * タスク1件の情報を表示し、完了切り替えアクションを提供する。
 * カード全体がクリック可能で、クリックすると詳細パネルが開く。
 * depth === 0 の場合はカード内部の左端にトグルボタン（子あり）またはスペーサー（子なし）を表示する。
 * depth > 0 の場合はタイトル行の先頭に「└」アイコンを表示する。
 */
function TaskCard({
  node,
  isCollapsed,
  onToggleCollapse,
  onToggleComplete,
  onSelect,
}: TaskCardProps) {
  const isCompleted = Boolean(node.is_completed);
  const cardStateClass = isCompleted
    ? CARD_COMPLETED_CLASSES
    : node.hasPartiallyCompletedChildren
      ? CARD_PARTIAL_CLASSES
      : CARD_DEFAULT_CLASSES;

  return (
    <div
      onClick={onSelect}
      className={`bg-slate-700 border rounded-lg p-5 cursor-pointer hover:bg-slate-600 transition-colors ${cardStateClass} ${node.depth > 0 ? 'border-l-2 border-l-slate-500' : ''}`}
    >
      <div className={node.depth === 0 ? 'flex items-start gap-2' : undefined}>
        {/* depth === 0 のみ: 子タスクあり → トグルボタン、なし → スペーサー */}
        {node.depth === 0 &&
          (node.children.length > 0 ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
              aria-label="子タスクの表示切り替え"
              className={`${TOGGLE_BUTTON_WIDTH_CLASS} h-6 shrink-0 mt-0.5 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors`}
            >
              <span
                className={`inline-block transition-transform duration-200 text-xs ${isCollapsed ? '' : 'rotate-90'}`}
              >
                ＞
              </span>
            </button>
          ) : (
            <div className={`${TOGGLE_BUTTON_WIDTH_CLASS} shrink-0`} />
          ))}

        {/* カードコンテンツ（タイトル・バッジ・説明・期限・担当者・アクションボタン） */}
        <div className={node.depth === 0 ? 'flex-1 min-w-0' : undefined}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {node.depth > 0 && (
                  <span className="shrink-0 text-xs text-slate-500">└</span>
                )}
                <h2
                  className={`text-base font-semibold text-slate-100 truncate ${isCompleted ? 'line-through opacity-60' : ''}`}
                >
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
              <p className="text-sm text-slate-400 line-clamp-2">{node.description}</p>
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
                {isCompleted && node.closed_by && (
                  <span className="text-green-400">クローズ: {node.closed_by}</span>
                )}
              </div>
            </div>

            <div className="shrink-0">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onToggleComplete(node.id, !isCompleted); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  isCompleted
                    ? 'text-slate-300 bg-green-700 hover:bg-green-600'
                    : 'text-slate-300 bg-slate-600 hover:bg-slate-500'
                }`}
              >
                {isCompleted ? '未完了に戻す' : '完了にする'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskCard;
