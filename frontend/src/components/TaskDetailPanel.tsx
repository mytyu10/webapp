import { useNavigate } from 'react-router-dom';
import { Task, PRIORITY_LABELS, PRIORITY_BADGE_CLASSES } from '../api/taskApi';

/** TaskDetailPanel コンポーネントのProps型 */
interface TaskDetailPanelProps {
  /** 表示対象のタスク。null の場合は「見つかりません」を表示 */
  task: Task | null;
  /** PATCH 処理中かどうか（完了ボタンを非活性にする） */
  isToggling: boolean;
  /** 現在のユーザーがタスクの作成者かどうか（削除ボタンの表示制御） */
  isOwner: boolean;
  /** パネルを閉じるコールバック */
  onClose: () => void;
  /** 完了状態切り替えコールバック（useTaskList と共有） */
  onToggleComplete: (id: number, is_completed: boolean) => Promise<void>;
  /** 子タスク・親タスクのリンクをクリックしたときに呼ばれるコールバック */
  onSelectTask: (id: number) => void;
  /** 削除確認モーダルを開くコールバック */
  onDeleteClick: (id: number) => void;
}

/**
 * タスク詳細サイドパネルコンポーネント
 * タスク一覧画面の右側に表示するサイドパネル。
 * タスクデータは useTaskList と共有した props で受け取り、独自の API 呼び出しは行わない。
 * 完了切り替え・編集・削除・子タスク作成のアクションを提供する。
 */
function TaskDetailPanel({
  task,
  isToggling,
  isOwner,
  onClose,
  onToggleComplete,
  onSelectTask,
  onDeleteClick,
}: TaskDetailPanelProps) {
  const navigate = useNavigate();

  return (
    <div className="w-96 shrink-0 bg-slate-800 border-l border-slate-600 flex flex-col h-full overflow-y-auto">
      {/* パネルヘッダー */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-600 sticky top-0 bg-slate-800 z-10">
        <h2 className="text-base font-bold text-slate-100">タスク詳細</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="詳細パネルを閉じる"
          className="text-slate-400 hover:text-slate-200 transition-colors text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* パネルコンテンツ */}
      <div className="p-5 flex-1">
        {task === null && (
          <p className="text-slate-400 text-sm">タスクが見つかりません。</p>
        )}

        {task !== null && (
          <div
            className={`bg-slate-700 border rounded-xl p-5 space-y-4 ${task.is_completed ? 'border-green-700 opacity-80' : 'border-slate-600'}`}
          >
            {/* 親タスクへのリンク */}
            {task.parent_id !== null && (
              <div>
                <button
                  type="button"
                  onClick={() => onSelectTask(task.parent_id as number)}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  ← 親タスクへ
                </button>
              </div>
            )}

            {/* 完了バナー */}
            {task.is_completed && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-900 border border-green-700 rounded-md">
                <span className="text-green-400 text-sm font-medium">完了済み</span>
                {task.closed_by && (
                  <span className="text-green-300 text-sm">クローズ: {task.closed_by}</span>
                )}
              </div>
            )}

            {/* タイトル */}
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">タイトル</p>
              <p className={`text-base font-semibold text-slate-100 ${task.is_completed ? 'line-through opacity-60' : ''}`}>
                {task.title}
              </p>
            </div>

            {/* 説明文 */}
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">説明文</p>
              <p className="text-sm text-slate-200 whitespace-pre-wrap">{task.description}</p>
            </div>

            {/* 優先度・カテゴリ */}
            <div className="flex gap-4 flex-wrap">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">優先度</p>
                <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${PRIORITY_BADGE_CLASSES[task.priority]}`}>
                  {PRIORITY_LABELS[task.priority]}
                </span>
              </div>
              {task.category && (
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">カテゴリ</p>
                  <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-full bg-slate-600 text-slate-300">
                    {task.category}
                  </span>
                </div>
              )}
            </div>

            {/* 期限 */}
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">期限</p>
              <p className="text-sm text-slate-200">
                {new Date(task.due_date).toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {/* 担当者 */}
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">担当者</p>
              {task.assignees.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {task.assignees.map((username) => (
                    <span key={username} className="px-2.5 py-1 bg-slate-600 text-slate-200 text-xs rounded-full">
                      {username}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">担当者なし</p>
              )}
            </div>

            {/* 作成者 */}
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">作成者</p>
              <p className="text-sm text-slate-200">{task.created_by}</p>
            </div>

            {/* 作成日時 */}
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">作成日時</p>
              <p className="text-sm text-slate-400">
                {new Date(task.created_at).toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {/* 子タスク一覧 */}
            {task.children.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">子タスク</p>
                <div className="space-y-2">
                  {task.children.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => onSelectTask(child.id)}
                      className="w-full text-left block px-3 py-2.5 bg-slate-600 hover:bg-slate-500 border border-slate-500 rounded-md transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {child.is_completed && (
                          <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-green-900 text-green-400 border border-green-700">
                            完了
                          </span>
                        )}
                        <span className={`text-sm font-medium text-slate-100 truncate ${child.is_completed ? 'line-through opacity-60' : ''}`}>
                          {child.title}
                        </span>
                        <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${PRIORITY_BADGE_CLASSES[child.priority]}`}>
                          {PRIORITY_LABELS[child.priority]}
                        </span>
                        {child.category && (
                          <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-500 text-slate-300">
                            {child.category}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{child.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* アクションボタン */}
            <div className="pt-2 flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => void onToggleComplete(task.id, !task.is_completed)}
                disabled={isToggling}
                className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                  task.is_completed
                    ? 'bg-green-700 hover:bg-green-600 text-white'
                    : 'bg-slate-600 hover:bg-slate-500 text-white'
                }`}
              >
                {task.is_completed ? '未完了に戻す' : '完了にする'}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/tasks/${task.id}/edit`)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-md transition-colors"
              >
                編集する
              </button>
              <button
                type="button"
                onClick={() => navigate(`/tasks/new?parent_id=${task.id}`)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm font-semibold rounded-md transition-colors"
              >
                子タスクを作成
              </button>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => onDeleteClick(task.id)}
                  className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-semibold rounded-md transition-colors"
                >
                  削除する
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskDetailPanel;
