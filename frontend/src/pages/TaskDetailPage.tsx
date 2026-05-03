import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTask, getCurrentUsername, Task, PRIORITY_LABELS, PRIORITY_BADGE_CLASSES } from '../api/taskApi';
import FormErrorBanner from '../components/FormErrorBanner';
import { logger } from '../logger';

const CONTEXT = 'TaskDetailPage';

/**
 * タスク詳細ページ
 * 指定IDのタスク詳細・子タスク一覧を表示する
 * タスク作成者のみ編集ボタンを表示する
 */
function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentUsername = getCurrentUsername();

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

  const isOwner = currentUsername !== null && task !== null && task.created_by === currentUsername;

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
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => navigate(`/tasks/${child.id}`)}
                    className="w-full text-left px-3 py-2.5 bg-slate-600 hover:bg-slate-500 border border-slate-500 rounded-md transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-100 truncate">{child.title}</span>
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
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex gap-3 flex-wrap">
            {isOwner && (
              <button
                type="button"
                onClick={() => navigate(`/tasks/${task.id}/edit`)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-md transition-colors"
              >
                編集する
              </button>
            )}
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
