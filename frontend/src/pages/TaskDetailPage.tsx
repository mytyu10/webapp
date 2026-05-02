import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTask, Task } from '../api/taskApi';
import FormErrorBanner from '../components/FormErrorBanner';
import { logger } from '../logger';

const CONTEXT = 'TaskDetailPage';

/**
 * タスク詳細ページ
 * 指定IDのタスク詳細を表示する
 */
function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    async function loadTask(): Promise<void> {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        logger.info(CONTEXT, `タスク詳細読み込み: id=${id}`);
        const data = await fetchTask(Number(id));
        setTask(data);
        logger.info(CONTEXT, `タスク詳細読み込み完了: id=${id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'タスクの取得に失敗しました。';
        logger.warn(CONTEXT, `タスク詳細読み込み失敗: id=${id} - ${message}`);
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    void loadTask();
  }, [id]);

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

      <FormErrorBanner message={error} />

      {loading && <p className="text-slate-400 text-sm">読み込み中...</p>}

      {!loading && task && (
        <div className="bg-slate-700 border border-slate-600 rounded-xl p-6 space-y-5">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">タイトル</p>
            <p className="text-base font-semibold text-slate-100">{task.title}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">説明文</p>
            <p className="text-sm text-slate-200 whitespace-pre-wrap">{task.description}</p>
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

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => navigate(`/tasks/${task.id}/edit`)}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-md transition-colors"
            >
              編集する
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskDetailPage;
