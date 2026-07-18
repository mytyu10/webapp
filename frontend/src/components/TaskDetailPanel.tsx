import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Task,
  TaskInput,
  PRIORITY_BADGE_CLASSES,
  PRIORITY_LABELS,
} from '../api/taskApi';
import {
  fetchTaskPermissions,
  addTaskPermission,
  deleteTaskPermission,
  Permission,
  PermissionInput,
} from '../api/permissionApi';
import PermissionModal from './PermissionModal';
import TaskEditForm from './TaskEditForm';
import { logger } from '../logger';

const CONTEXT = 'TaskDetailPanel';

/** TaskDetailPanel コンポーネントのProps型 */
interface TaskDetailPanelProps {
  /** 表示対象のタスク。null の場合は「見つかりません」を表示 */
  task: Task | null;
  /** PATCH 処理中かどうか（完了ボタンを含む全操作を無効化する） */
  isToggling: boolean;
  /** 現在のユーザーがタスクの作成者かどうか（削除ボタンの表示制御） */
  isOwner: boolean;
  /** スマホ表示かどうか（一覧へ戻るボタン表示・閉じるボタンサイズ制御） */
  isMobile: boolean;
  /** パネルを閉じるコールバック */
  onClose: () => void;
  /** 完了状態切り替えコールバック（useTaskList と共有） */
  onToggleComplete: (id: number, is_completed: boolean) => Promise<void>;
  /** 子タスク・親タスクのリンクをクリックしたときに呼ばれるコールバック */
  onSelectTask: (id: number) => void;
  /** 削除確認モーダルを開くコールバック */
  onDeleteClick: (id: number) => void;
  /** タスク更新コールバック（useTaskList と共有） */
  onUpdate: (id: number, input: Partial<TaskInput>) => Promise<Task>;
}

/**
 * タスク詳細サイドパネルコンポーネント
 * タスク一覧画面の右側に表示するサイドパネル。
 * タスクデータは useTaskList と共有した props で受け取り、独自の API 呼び出しは行わない。
 * 編集・削除・子タスク作成・権限共有のアクションを提供する。
 * 「編集する」ボタン押下でパネル内にインライン編集フォーム（TaskEditForm）を表示する。
 * スマホ（isMobile=true）時は「← 一覧へ戻る」ボタンを表示し、閉じるボタンを拡大する。
 * 作成者のみ「共有」ボタンを表示し、PermissionModal で権限管理を行う。
 */
function TaskDetailPanel({
  task,
  isToggling,
  isOwner,
  isMobile,
  onClose,
  onToggleComplete,
  onSelectTask,
  onDeleteClick,
  onUpdate,
}: TaskDetailPanelProps) {
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);

  /** 権限モーダルの表示状態 */
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  /** タスクの現在の権限一覧 */
  const [permissions, setPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    setIsEditing(false);
    setIsPermissionModalOpen(false);
  }, [task?.id]);

  /**
   * 権限モーダルを開く（権限一覧を取得してから表示する）
   */
  async function handleOpenPermissionModal(): Promise<void> {
    if (!task) return;
    try {
      const perms = await fetchTaskPermissions(task.id);
      setPermissions(perms);
      setIsPermissionModalOpen(true);
    } catch (err) {
      logger.warn(CONTEXT, `権限一覧取得失敗: ${err instanceof Error ? err.message : '不明なエラー'}`);
    }
  }

  /**
   * 権限を付与してローカルステートを更新する
   */
  async function handleAddPermission(input: PermissionInput): Promise<void> {
    if (!task) return;
    const added = await addTaskPermission(task.id, input);
    setPermissions((prev) => {
      const filtered = prev.filter((p) => p.username !== added.username);
      return [...filtered, added];
    });
  }

  /**
   * 権限を削除してローカルステートを更新する
   */
  async function handleRemovePermission(username: string): Promise<void> {
    if (!task) return;
    await deleteTaskPermission(task.id, username);
    setPermissions((prev) => prev.filter((p) => p.username !== username));
  }

  /**
   * タスク編集フォームの保存完了後に編集モードを終了する
   */
  async function handleEditSave(id: number, input: Partial<TaskInput>): Promise<void> {
    await onUpdate(id, input);
    setIsEditing(false);
  }

  return (
    <div className="w-full bg-slate-800 border-l border-slate-600 flex flex-col h-full overflow-y-auto">
      {/* 権限モーダル */}
      {isPermissionModalOpen && (
        <PermissionModal
          title={`「${task?.title ?? ''}」の共有設定`}
          permissions={permissions}
          onAdd={handleAddPermission}
          onRemove={handleRemovePermission}
          onClose={() => setIsPermissionModalOpen(false)}
        />
      )}

      {/* パネルヘッダー */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-600 sticky top-0 bg-slate-800 z-10">
        <div className="flex items-center gap-3">
          {/* スマホ時のみ「← 一覧へ戻る」ボタンを表示する */}
          {isMobile && (
            <button
              type="button"
              onClick={onClose}
              aria-label="一覧へ戻る"
              className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors text-sm font-medium"
            >
              ← 一覧へ戻る
            </button>
          )}
          <h2 className="text-base font-bold text-slate-100">
            {isEditing ? 'タスク編集' : 'タスク詳細'}
          </h2>
        </div>
        {/* PC時のみ右上の閉じるボタンを表示する（スマホは「一覧へ戻る」で代替） */}
        {!isMobile && (
          <button
            type="button"
            onClick={onClose}
            aria-label="詳細パネルを閉じる"
            className="text-slate-400 hover:text-slate-200 transition-colors text-lg leading-none"
          >
            ×
          </button>
        )}
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

            {isEditing ? (
              /* 編集フォーム */
              <TaskEditForm
                task={task}
                onSave={handleEditSave}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              /* 詳細表示 */
              <>
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
                    className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      task.is_completed
                        ? 'bg-green-700 hover:bg-green-600 text-white'
                        : 'bg-slate-600 hover:bg-slate-500 text-white'
                    }`}
                  >
                    {isToggling ? '処理中...' : task.is_completed ? '未完了に戻す' : '完了にする'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    disabled={isToggling}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-colors"
                  >
                    編集する
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/tasks/new?parent_id=${task.id}`)}
                    disabled={isToggling}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-colors"
                  >
                    子タスクを作成
                  </button>
                  {/* 作成者のみ共有ボタンを表示する */}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => void handleOpenPermissionModal()}
                      disabled={isToggling}
                      className="px-4 py-2 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-colors"
                    >
                      共有
                    </button>
                  )}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => onDeleteClick(task.id)}
                      disabled={isToggling}
                      className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-md transition-colors"
                    >
                      削除する
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskDetailPanel;
