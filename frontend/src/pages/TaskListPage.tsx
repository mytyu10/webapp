import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTaskList } from '../hooks/useTaskList';
import { getCurrentUsername, PRIORITY_LABELS, PRIORITY_BADGE_CLASSES } from '../api/taskApi';
import FormErrorBanner from '../components/FormErrorBanner';
import ConfirmModal from '../components/ConfirmModal';

/**
 * タスク一覧ページ
 * タスクの一覧表示・カテゴリフィルタリング・削除・作成・編集・詳細遷移を提供する
 * 編集・削除ボタンはタスク作成者のみ表示する
 */
function TaskListPage() {
  const navigate = useNavigate();
  const {
    filteredTasks,
    categories,
    selectedCategory,
    loading,
    error,
    handleDelete,
    setSelectedCategory,
  } = useTaskList();

  const [deleteError, setDeleteError] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

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

      <FormErrorBanner message={error || deleteError} />

      {loading && (
        <p className="text-slate-400 text-sm">読み込み中...</p>
      )}

      {!loading && filteredTasks.length === 0 && !error && (
        <p className="text-slate-400 text-sm">タスクがありません。</p>
      )}

      {!loading && filteredTasks.length > 0 && (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isOwner = currentUsername !== null && task.created_by === currentUsername;

            return (
              <div
                key={task.id}
                className="bg-slate-700 border border-slate-600 rounded-lg p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="text-base font-semibold text-slate-100 truncate">
                        {task.title}
                      </h2>
                      <span
                        className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${PRIORITY_BADGE_CLASSES[task.priority]}`}
                      >
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                      {task.category && (
                        <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-600 text-slate-300">
                          {task.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-2">
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
                    {isOwner && (
                      <>
                        <button
                          type="button"
                          onClick={() => navigate(`/tasks/${task.id}/edit`)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-600 hover:bg-slate-500 rounded-md transition-colors"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteClick(task.id)}
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
          })}
        </div>
      )}
    </div>
  );
}

export default TaskListPage;
