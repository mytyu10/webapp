import { useParams, useNavigate, Link } from 'react-router-dom';
import { PRIORITY_LABELS, PRIORITY_BADGE_CLASSES } from '../api/taskApi';
import { useTaskDetail } from '../hooks/useTaskDetail';
import FormErrorBanner from '../components/FormErrorBanner';

/**
 * タスク詳細ページ
 * 指定IDのタスク詳細・子タスク一覧を表示する
 * 「完了にする」/「未完了に戻す」ボタンで完了状態をトグルできる
 * 編集ボタンはログインユーザーに関わらず常時表示する
 */
function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { task, loading, error, toggleCompleteError, isToggling, handleToggleComplete } = useTaskDetail(id);

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => navigate('/tasks')}
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          ← 一覧に戻る
        </button>
        <h1 className="text-2xl font-bold text-slate-100">タスク詳細</h1>
      </div>

      <FormErrorBanner message={error || toggleCompleteError} />

      {loading && <p className="text-slate-400 text-sm">読み込み中...</p>}

      {!loading && task && (
        <div className={`bg-slate-700 border rounded-xl p-6 space-y-5 ${task.is_completed ? 'border-green-700 opacity-80' : 'border-slate-600'}`}>
          {task.parent_id !== null && (
            <div>
              <Link
                to={`/tasks/${task.parent_id}`}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                ← 親タスクへ
              </Link>
            </div>
          )}

          {task.is_completed && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-900 border border-green-700 rounded-md">
              <span className="text-green-400 text-sm font-medium">完了済み</span>
              {task.closed_by && (
                <span className="text-green-300 text-sm">クローズ: {task.closed_by}</span>
              )}
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">タイトル</p>
            <p className={`text-base font-semibold text-slate-100 ${task.is_completed ? 'line-through opacity-60' : ''}`}>
              {task.title}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">説明文</p>
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{task.description}</p>
          </div>

          <div className="flex gap-4 flex-wrap">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">優先度</p>
              <span
                className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${PRIORITY_BADGE_CLASSES[task.priority]}`}
              >
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

          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">担当者</p>
            {task.assignees.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {task.assignees.map((username) => (
                  <span
                    key={username}
                    className="px-2.5 py-1 bg-slate-600 text-slate-200 text-xs rounded-full"
                  >
                    {username}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">担当者なし</p>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">作成者</p>
            <p className="text-sm text-slate-200">{task.created_by}</p>
          </div>

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

          {task.children.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">子タスク</p>
              <div className="space-y-2">
                {task.children.map((child) => (
                  <Link
                    key={child.id}
                    to={`/tasks/${child.id}`}
                    className="block px-3 py-2.5 bg-slate-600 hover:bg-slate-500 border border-slate-500 rounded-md transition-colors"
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
                      <span
                        className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${PRIORITY_BADGE_CLASSES[child.priority]}`}
                      >
                        {PRIORITY_LABELS[child.priority]}
                      </span>
                      {child.category && (
                        <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-500 text-slate-300">
                          {child.category}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400 line-clamp-1">{child.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => void handleToggleComplete()}
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
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskDetailPage;
