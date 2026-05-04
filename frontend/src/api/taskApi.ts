import { logger } from '../logger';

const { REACT_APP_API_SCHEME, REACT_APP_API_HOST, REACT_APP_API_PORT } = process.env;
const API_BASE = REACT_APP_API_HOST
  ? `${REACT_APP_API_SCHEME}://${REACT_APP_API_HOST}:${REACT_APP_API_PORT}`
  : '';
const CONTEXT = 'taskApi';

/** 優先度の有効値 */
export const PRIORITY_VALUES = ['HIGH', 'MEDIUM', 'LOW'] as const;

/** 優先度型 */
export type Priority = (typeof PRIORITY_VALUES)[number];

/** 優先度の日本語表示ラベル */
export const PRIORITY_LABELS: Record<Priority, string> = {
  HIGH: '高',
  MEDIUM: '中',
  LOW: '低',
};

/** 優先度バッジのTailwindクラス */
export const PRIORITY_BADGE_CLASSES: Record<Priority, string> = {
  HIGH: 'bg-red-800 text-red-200',
  MEDIUM: 'bg-yellow-800 text-yellow-200',
  LOW: 'bg-slate-600 text-slate-300',
};

/** タスクレスポンス型 */
export interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string;
  priority: Priority;
  category: string | null;
  parent_id: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_completed: boolean;
  /** 完了にした（クローズした）ユーザー名。未完了時は null */
  closed_by: string | null;
  assignees: string[];
  children: Task[];
}

/** タスク作成・更新リクエスト型 */
export interface TaskInput {
  title: string;
  description: string;
  due_date: string;
  assignees: string[];
  priority?: Priority;
  category?: string;
  parent_id?: number;
  created_by?: string;
  is_completed?: boolean;
}

/** JWTペイロードの型（usernameフィールドのみ使用） */
interface JwtPayloadDecoded {
  username?: string;
}

/**
 * 認証ヘッダーを構築する
 */
function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/**
 * localStorageのJWTをデコードしてusernameを取得する
 * デコード失敗時はnullを返す
 */
export function getCurrentUsername(): string | null {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson) as JwtPayloadDecoded;
    return payload.username ?? null;
  } catch {
    logger.warn(CONTEXT, 'JWTのデコードに失敗しました');
    return null;
  }
}

/**
 * タスク一覧を取得する
 */
export async function fetchTasks(): Promise<Task[]> {
  logger.info(CONTEXT, 'タスク一覧取得リクエスト送信');

  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || 'タスクの取得に失敗しました。';
    logger.warn(CONTEXT, `タスク一覧取得失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, 'タスク一覧取得成功');
  return (await response.json()) as Task[];
}

/**
 * 指定IDのタスクを取得する
 */
export async function fetchTask(id: number): Promise<Task> {
  logger.info(CONTEXT, `タスク取得リクエスト送信: id=${id}`);

  const response = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || 'タスクの取得に失敗しました。';
    logger.warn(CONTEXT, `タスク取得失敗: id=${id} - ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `タスク取得成功: id=${id}`);
  return (await response.json()) as Task;
}

/**
 * カテゴリ一覧を取得する
 */
export async function fetchCategories(): Promise<string[]> {
  logger.info(CONTEXT, 'カテゴリ一覧取得リクエスト送信');

  const response = await fetch(`${API_BASE}/tasks/categories`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || 'カテゴリの取得に失敗しました。';
    logger.warn(CONTEXT, `カテゴリ一覧取得失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, 'カテゴリ一覧取得成功');
  return (await response.json()) as string[];
}

/**
 * タスクを作成する
 */
export async function createTask(input: TaskInput): Promise<Task> {
  logger.info(CONTEXT, `タスク作成リクエスト送信: ${input.title}`);

  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || 'タスクの作成に失敗しました。';
    logger.warn(CONTEXT, `タスク作成失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, 'タスク作成成功');
  const data = await response.json() as { message: string; task: Task };
  return data.task;
}

/**
 * タスクを更新する
 */
export async function updateTask(id: number, input: Partial<TaskInput>): Promise<Task> {
  logger.info(CONTEXT, `タスク更新リクエスト送信: id=${id}`);

  const response = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || 'タスクの更新に失敗しました。';
    logger.warn(CONTEXT, `タスク更新失敗: id=${id} - ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `タスク更新成功: id=${id}`);
  const data = await response.json() as { message: string; task: Task };
  return data.task;
}

/**
 * タスクの完了状態を切り替える
 * updateTaskのラッパー関数
 */
export async function toggleTaskCompletion(id: number, is_completed: boolean): Promise<Task> {
  logger.info(CONTEXT, `タスク完了状態切り替え: id=${id}, is_completed=${String(is_completed)}`);
  return updateTask(id, { is_completed });
}

/**
 * タスクを削除する
 */
export async function deleteTask(id: number): Promise<void> {
  logger.info(CONTEXT, `タスク削除リクエスト送信: id=${id}`);

  const response = await fetch(`${API_BASE}/tasks/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || 'タスクの削除に失敗しました。';
    logger.warn(CONTEXT, `タスク削除失敗: id=${id} - ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `タスク削除成功: id=${id}`);
}
