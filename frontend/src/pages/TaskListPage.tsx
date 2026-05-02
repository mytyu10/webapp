import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskList } from '../hooks/useTaskList';
import FormErrorBanner from '../components/FormErrorBanner';

/**
 * タスク一覧ページ
 * タスクの一覧表示・削除・作成・編集・詳細遷移を提供する
 */
function TaskListPage() {
  const navigate = useNavigate();
  const { tasks, loading, error, handleDelete } = useTaskList();
  const [deleteError, setDeleteError] = useState('');

  /**
   * タスク削除確認ダイアログを表示して削除を実行する
   */
  async function onDeleteClick(id: number): Promise<void> {
    if (!window.confirm('このタスクを削除してもよろしいですか？')) return;
    setDeleteError('');
    try {
      await handleDelete(id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'タスクの削除に失敗しました。');
    }
  }

  return (
    <div>
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

      <FormErrorBanner message={error || deleteError} />

      {loading && (
        <p className="text-slate-400 text-sm">読み込み中...</p>
      )}

      {!loading && tasks.length === 0 && !error && (
        <p className="text-slate-400 text-sm">タスクがありません。</p>
      )}

      {!loading && tasks.length > 0 && (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="bg-slate-700 border border-slate-600 rounded-lg p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-semibold text-slate-100 truncate">
                    {task.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400 line-clamp-2">
                    {task.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                    <span>
                      期限:{' '}
                      {new Date(task.due_date).toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {task.assignees.length > 0 && (
                      <span>担当者: {task.assignees.join(', ')}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-600 hover:bg-slate-500 rounded-md transition-colors"
                  >
                    詳細
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/tasks/${task.id}/edit`)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-600 hover:bg-slate-500 rounded-md transition-colors"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDeleteClick(task.id)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-red-700 hover:bg-red-600 rounded-md transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TaskListPage;
