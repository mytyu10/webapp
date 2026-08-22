import { logger } from '../logger';

const { REACT_APP_API_SCHEME, REACT_APP_API_HOST, REACT_APP_API_PORT } = process.env;
const API_BASE = REACT_APP_API_HOST
  ? `${REACT_APP_API_SCHEME}://${REACT_APP_API_HOST}:${REACT_APP_API_PORT}`
  : '';
const CONTEXT = 'permissionApi';

/** 権限種別 */
export type PermissionType = 'READ' | 'WRITE';

/** 権限レスポンス型 */
export interface Permission {
  username: string;
  permission: PermissionType;
}

/** 権限付与リクエスト型 */
export interface PermissionInput {
  username: string;
  permission: PermissionType;
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
 * タスクの権限一覧を取得する（作成者のみ）
 */
export async function fetchTaskPermissions(taskId: number): Promise<Permission[]> {
  logger.info(CONTEXT, `タスク権限一覧取得リクエスト送信: taskId=${taskId}`);

  const response = await fetch(`${API_BASE}/tasks/${taskId}/permissions`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || '権限一覧の取得に失敗しました。';
    logger.warn(CONTEXT, `タスク権限一覧取得失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `タスク権限一覧取得成功: taskId=${taskId}`);
  return (await response.json()) as Permission[];
}

/**
 * タスクへの権限を付与する（作成者のみ）
 */
export async function addTaskPermission(taskId: number, input: PermissionInput): Promise<Permission> {
  logger.info(CONTEXT, `タスク権限付与リクエスト送信: taskId=${taskId}, target=${input.username}`);

  const response = await fetch(`${API_BASE}/tasks/${taskId}/permissions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || '権限の付与に失敗しました。';
    logger.warn(CONTEXT, `タスク権限付与失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `タスク権限付与成功: taskId=${taskId}, target=${input.username}`);
  const data = await response.json() as { message: string; permission: Permission };
  return data.permission;
}

/**
 * タスクの権限を削除する（作成者のみ）
 */
export async function deleteTaskPermission(taskId: number, username: string): Promise<void> {
  logger.info(CONTEXT, `タスク権限削除リクエスト送信: taskId=${taskId}, target=${username}`);

  const response = await fetch(`${API_BASE}/tasks/${taskId}/permissions/${username}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || '権限の削除に失敗しました。';
    logger.warn(CONTEXT, `タスク権限削除失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `タスク権限削除成功: taskId=${taskId}, target=${username}`);
}

/**
 * リンクアイテムの権限一覧を取得する（作成者のみ）
 */
export async function fetchLinkPermissions(linkItemId: number): Promise<Permission[]> {
  logger.info(CONTEXT, `リンク権限一覧取得リクエスト送信: linkItemId=${linkItemId}`);

  const response = await fetch(`${API_BASE}/links/${linkItemId}/permissions`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || '権限一覧の取得に失敗しました。';
    logger.warn(CONTEXT, `リンク権限一覧取得失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `リンク権限一覧取得成功: linkItemId=${linkItemId}`);
  return (await response.json()) as Permission[];
}

/**
 * リンクアイテムへの権限を付与する（作成者のみ）
 */
export async function addLinkPermission(linkItemId: number, input: PermissionInput): Promise<Permission> {
  logger.info(CONTEXT, `リンク権限付与リクエスト送信: linkItemId=${linkItemId}, target=${input.username}`);

  const response = await fetch(`${API_BASE}/links/${linkItemId}/permissions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || '権限の付与に失敗しました。';
    logger.warn(CONTEXT, `リンク権限付与失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `リンク権限付与成功: linkItemId=${linkItemId}, target=${input.username}`);
  const data = await response.json() as { message: string; permission: Permission };
  return data.permission;
}

/**
 * リンクアイテムの権限を削除する（作成者のみ）
 */
export async function deleteLinkPermission(linkItemId: number, username: string): Promise<void> {
  logger.info(CONTEXT, `リンク権限削除リクエスト送信: linkItemId=${linkItemId}, target=${username}`);

  const response = await fetch(`${API_BASE}/links/${linkItemId}/permissions/${username}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || '権限の削除に失敗しました。';
    logger.warn(CONTEXT, `リンク権限削除失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `リンク権限削除成功: linkItemId=${linkItemId}, target=${username}`);
}

/**
 * 予定の権限一覧を取得する（作成者のみ）
 */
export async function fetchEventPermissions(eventId: number): Promise<Permission[]> {
  logger.info(CONTEXT, `予定権限一覧取得リクエスト送信: eventId=${eventId}`);

  const response = await fetch(`${API_BASE}/events/${eventId}/permissions`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || '権限一覧の取得に失敗しました。';
    logger.warn(CONTEXT, `予定権限一覧取得失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `予定権限一覧取得成功: eventId=${eventId}`);
  return (await response.json()) as Permission[];
}

/**
 * 予定へ権限を付与する（作成者のみ）
 */
export async function addEventPermission(eventId: number, input: PermissionInput): Promise<Permission> {
  logger.info(CONTEXT, `予定権限付与リクエスト送信: eventId=${eventId}, target=${input.username}`);

  const response = await fetch(`${API_BASE}/events/${eventId}/permissions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || '権限の付与に失敗しました。';
    logger.warn(CONTEXT, `予定権限付与失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `予定権限付与成功: eventId=${eventId}, target=${input.username}`);
  const data = await response.json() as { message: string; permission: Permission };
  return data.permission;
}

/**
 * 予定の権限を削除する（作成者のみ）
 */
export async function deleteEventPermission(eventId: number, username: string): Promise<void> {
  logger.info(CONTEXT, `予定権限削除リクエスト送信: eventId=${eventId}, target=${username}`);

  const response = await fetch(`${API_BASE}/events/${eventId}/permissions/${username}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || '権限の削除に失敗しました。';
    logger.warn(CONTEXT, `予定権限削除失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `予定権限削除成功: eventId=${eventId}, target=${username}`);
}
