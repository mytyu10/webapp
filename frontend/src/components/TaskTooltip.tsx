import { PRIORITY_LABELS, Priority } from '../api/taskApi';

/** タスクツールチップのprops型 */
interface TaskTooltipProps {
  /** タスクタイトル */
  title: string;
  /** タスク説明文 */
  description: string;
  /** 優先度 */
  priority: Priority;
  /** カテゴリ */
  category: string | null;
  /** 完了フラグ */
  is_completed: boolean;
  /** 作成者 */
  created_by: string;
  /** 表示するX座標（px） */
  x: number;
  /** 表示するY座標（px） */
  y: number;
}

/**
 * タスクホバー時に表示するツールチップコンポーネント
 * カレンダーの日表示でタスクをマウスオーバーした際に詳細情報を表示する
 */
function TaskTooltip({
  title,
  description,
  priority,
  category,
  is_completed,
  created_by,
  x,
  y,
}: TaskTooltipProps) {
  return (
    <div
      className="fixed z-50 bg-slate-900 border border-slate-600 rounded-lg shadow-2xl p-3 w-64 pointer-events-none"
      style={{ left: x + 12, top: y + 12 }}
    >
      <p className="text-sm font-semibold text-slate-100 mb-1 break-words">{title}</p>
      {description && (
        <p className="text-xs text-slate-400 mb-2 break-words line-clamp-3">{description}</p>
      )}
      <div className="flex flex-wrap gap-1 text-xs">
        <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
          優先度: {PRIORITY_LABELS[priority]}
        </span>
        {category && (
          <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
            {category}
          </span>
        )}
        <span
          className={`px-1.5 py-0.5 rounded ${is_completed ? 'bg-green-900 text-green-300' : 'bg-slate-700 text-slate-400'}`}
        >
          {is_completed ? '完了' : '未完了'}
        </span>
        <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">
          作成者: {created_by}
        </span>
      </div>
    </div>
  );
}

export default TaskTooltip;
