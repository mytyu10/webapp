import { logger } from '../logger';

const { REACT_APP_API_SCHEME, REACT_APP_API_HOST, REACT_APP_API_PORT } = process.env;
const API_BASE = `${REACT_APP_API_SCHEME}://${REACT_APP_API_HOST}:${REACT_APP_API_PORT}`;
const CONTEXT = 'taskApi';

/** タスクレスポンス型 */
export interface Task {
  id: number;
  title: string;
  description: string;
  due_date: string;
  created_at: string;
  updated_at: string;
  assignees: string[];
}

/** タスク作成・更新リクエスト型 */
export interface TaskInput {
  title: string;
  description: string;
  due_date: string;
  assignees: string[];
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
  const data = await response.json() as { task: Task };
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
  const data = await response.json() as { task: Task };
  return data.task;
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
