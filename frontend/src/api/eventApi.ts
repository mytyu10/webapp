import { logger } from '../logger';

const { REACT_APP_API_SCHEME, REACT_APP_API_HOST, REACT_APP_API_PORT } = process.env;
const API_BASE = REACT_APP_API_HOST
  ? `${REACT_APP_API_SCHEME}://${REACT_APP_API_HOST}:${REACT_APP_API_PORT}`
  : '';
const CONTEXT = 'eventApi';

/** カレンダー予定レスポンス型 */
export interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** 予定作成・更新リクエスト型。作成者はJWT認証済みユーザー名をサーバー側で自動セットするため含めない */
export interface EventInput {
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
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
 * 予定一覧を取得する
 */
export async function fetchEvents(): Promise<CalendarEvent[]> {
  logger.info(CONTEXT, '予定一覧取得リクエスト送信');

  const response = await fetch(`${API_BASE}/events`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || '予定の取得に失敗しました。';
    logger.warn(CONTEXT, `予定一覧取得失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, '予定一覧取得成功');
  return (await response.json()) as CalendarEvent[];
}

/**
 * 予定を作成する
 */
export async function createEvent(input: EventInput): Promise<CalendarEvent> {
  logger.info(CONTEXT, `予定作成リクエスト送信: ${input.title}`);

  const response = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || '予定の作成に失敗しました。';
    logger.warn(CONTEXT, `予定作成失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, '予定作成成功');
  const data = (await response.json()) as { message: string; event: CalendarEvent };
  return data.event;
}

/**
 * 予定を更新する
 */
export async function updateEvent(id: number, input: Partial<EventInput>): Promise<CalendarEvent> {
  logger.info(CONTEXT, `予定更新リクエスト送信: id=${id}`);

  const response = await fetch(`${API_BASE}/events/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || '予定の更新に失敗しました。';
    logger.warn(CONTEXT, `予定更新失敗: id=${id} - ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `予定更新成功: id=${id}`);
  const data = (await response.json()) as { message: string; event: CalendarEvent };
  return data.event;
}

/**
 * 予定を削除する
 */
export async function deleteEvent(id: number): Promise<void> {
  logger.info(CONTEXT, `予定削除リクエスト送信: id=${id}`);

  const response = await fetch(`${API_BASE}/events/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || '予定の削除に失敗しました。';
    logger.warn(CONTEXT, `予定削除失敗: id=${id} - ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `予定削除成功: id=${id}`);
}
