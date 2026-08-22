import { logger } from '../logger';

const { REACT_APP_API_SCHEME, REACT_APP_API_HOST, REACT_APP_API_PORT } = process.env;
const API_BASE = REACT_APP_API_HOST
  ? `${REACT_APP_API_SCHEME}://${REACT_APP_API_HOST}:${REACT_APP_API_PORT}`
  : '';
const CONTEXT = 'eventApi';

/** 予定に付与された権限 */
export interface EventPermission {
  username: string;
  permission: 'READ' | 'WRITE';
}

/** カレンダー予定レスポンス型 */
export interface CalendarEvent {
  id: number;
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  color: string;
  repeat_group_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  /** 共有されている場合の権限一覧（権限が付与されている予定のみ含む） */
  permissions?: EventPermission[];
}

/** 予定作成・更新リクエスト型 */
export interface EventInput {
  title: string;
  description?: string;
  start_at: string;
  end_at: string;
  /** 予定の色識別子（cyan/indigo/emerald/violet/rose/amber）。未指定時は cyan */
  color?: string;
  /**
   * 代理登録時の作成者ユーザー名。
   * 指定した場合はサーバー側でEventProxyGrant権限を確認する。未指定時はJWT認証済みユーザー名を使用する
   */
  created_by?: string;
}

/** 繰り返しタイプ */
export type RepeatType = 'daily' | 'weekly' | 'monthly';

/** 繰り返しルール型 */
export interface RepeatRule {
  /** 繰り返しタイプ（daily: 毎日, weekly: 毎週, monthly: 毎月） */
  type: RepeatType;
  /** 繰り返し間隔（例: 2 の場合は毎2日・毎2週・毎2ヶ月） */
  interval: number;
  /**
   * 対象曜日（0=日, 1=月, ..., 6=土）。type が weekly の場合のみ有効。
   * 未指定時は start_at の曜日を使用する
   */
  days_of_week?: number[];
  /** 繰り返し終了日（ISO8601形式）。count と排他的に使用する */
  end_date?: string;
  /** 繰り返し回数。end_date と排他的に使用する */
  count?: number;
}

/** 複数日付一括作成リクエスト型 */
export interface MultipleEventInput {
  title: string;
  description?: string;
  /** 開始日時の配列（ISO8601形式）。1件以上必須 */
  start_times: string[];
  /** 終了日時の配列（ISO8601形式）。start_times と同件数必須 */
  end_times: string[];
  /** 予定の色識別子（cyan/indigo/emerald/violet/rose/amber）。未指定時は cyan */
  color?: string;
  /** 代理登録時の作成者ユーザー名。未指定時はJWT認証済みユーザー名を使用する */
  created_by?: string;
}

/** 繰り返し予定作成リクエスト型 */
export interface RepeatEventInput {
  title: string;
  description?: string;
  /** 繰り返しの最初の開始日時（ISO8601形式） */
  start_at: string;
  /**
   * 繰り返しの最初の終了日時（ISO8601形式）。
   * end_at - start_at の差分ミリ秒を保持し、各繰り返し日の end_at を算出する
   */
  end_at: string;
  /** 繰り返しルール */
  repeat: RepeatRule;
  /** 予定の色識別子（cyan/indigo/emerald/violet/rose/amber）。未指定時は cyan */
  color?: string;
  /** 代理登録時の作成者ユーザー名。未指定時はJWT認証済みユーザー名を使用する */
  created_by?: string;
}

/** 繰り返しグループ全件更新リクエスト型 */
export interface UpdateRepeatGroupInput {
  title?: string;
  description?: string;
  /** 開始日時の差分（ミリ秒）。各予定の start_at に加算してシフトする */
  start_diff_ms?: number;
  /** 終了日時の差分（ミリ秒）。各予定の end_at に加算してシフトする */
  end_diff_ms?: number;
  /** 予定の色識別子（cyan/indigo/emerald/violet/rose/amber）。未指定時は変更なし */
  color?: string;
}

/** 権限付与リクエスト型 */
export interface EventPermissionInput {
  username: string;
  permission: 'READ' | 'WRITE';
}

/** 代理登録権限レスポンス型 */
export interface ProxyGrantUser {
  username: string;
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
 * 複数の開始日時と終了日時を指定して同じ内容の予定を一括作成する
 */
export async function createMultipleEvents(input: MultipleEventInput): Promise<CalendarEvent[]> {
  logger.info(CONTEXT, `複数予定作成リクエスト送信: ${input.title}, 件数=${input.start_times.length}`);

  const response = await fetch(`${API_BASE}/events/multiple`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || '複数予定の作成に失敗しました。';
    logger.warn(CONTEXT, `複数予定作成失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, '複数予定作成成功');
  const data = (await response.json()) as { message: string; events: CalendarEvent[] };
  return data.events;
}

/**
 * 繰り返しルールに基づいて予定を一括作成する
 */
export async function createRepeatEvent(input: RepeatEventInput): Promise<CalendarEvent[]> {
  logger.info(CONTEXT, `繰り返し予定作成リクエスト送信: ${input.title}`);

  const response = await fetch(`${API_BASE}/events/repeat`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || '繰り返し予定の作成に失敗しました。';
    logger.warn(CONTEXT, `繰り返し予定作成失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, '繰り返し予定作成成功');
  const data = (await response.json()) as { message: string; events: CalendarEvent[] };
  return data.events;
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
 * 繰り返しグループに属する全予定を一括更新する
 */
export async function updateRepeatGroupEvent(
  groupId: string,
  input: UpdateRepeatGroupInput,
): Promise<CalendarEvent[]> {
  logger.info(CONTEXT, `繰り返しグループ更新リクエスト送信: groupId=${groupId}`);

  const response = await fetch(`${API_BASE}/events/repeat-group/${groupId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || '繰り返し予定の更新に失敗しました。';
    logger.warn(CONTEXT, `繰り返しグループ更新失敗: groupId=${groupId} - ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `繰り返しグループ更新成功: groupId=${groupId}`);
  const data = (await response.json()) as { message: string; events: CalendarEvent[] };
  return data.events;
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

/**
 * 予定の権限一覧を取得する（作成者のみ）
 */
export async function fetchEventPermissions(eventId: number): Promise<EventPermission[]> {
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
  return (await response.json()) as EventPermission[];
}

/**
 * 予定へ権限を付与する（作成者のみ）
 */
export async function addEventPermission(
  eventId: number,
  input: EventPermissionInput,
): Promise<EventPermission> {
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
  const data = (await response.json()) as { message: string; permission: EventPermission };
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

/**
 * 自分が代理登録を許可しているユーザー一覧を取得する
 */
export async function fetchProxyGrantees(): Promise<ProxyGrantUser[]> {
  logger.info(CONTEXT, '代理登録許可ユーザー一覧取得リクエスト送信');

  const response = await fetch(`${API_BASE}/events/proxy-grants/grantees`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || '代理登録許可ユーザー一覧の取得に失敗しました。';
    logger.warn(CONTEXT, `代理登録許可ユーザー一覧取得失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, '代理登録許可ユーザー一覧取得成功');
  return (await response.json()) as ProxyGrantUser[];
}

/**
 * 自分が代理登録できるユーザー一覧を取得する
 */
export async function fetchProxyGranters(): Promise<ProxyGrantUser[]> {
  logger.info(CONTEXT, '代理登録可能ユーザー一覧取得リクエスト送信');

  const response = await fetch(`${API_BASE}/events/proxy-grants/granters`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || '代理登録可能ユーザー一覧の取得に失敗しました。';
    logger.warn(CONTEXT, `代理登録可能ユーザー一覧取得失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, '代理登録可能ユーザー一覧取得成功');
  return (await response.json()) as ProxyGrantUser[];
}

/**
 * 指定ユーザーに自分の予定への代理登録権限を付与する
 */
export async function addProxyGrant(granteeUsername: string): Promise<ProxyGrantUser> {
  logger.info(CONTEXT, `代理登録権限付与リクエスト送信: grantee=${granteeUsername}`);

  const response = await fetch(`${API_BASE}/events/proxy-grants`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ grantee_username: granteeUsername }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || '代理登録権限の付与に失敗しました。';
    logger.warn(CONTEXT, `代理登録権限付与失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `代理登録権限付与成功: grantee=${granteeUsername}`);
  const data = (await response.json()) as { message: string; grant: ProxyGrantUser };
  return data.grant;
}

/**
 * 指定ユーザーへの代理登録権限を削除する
 */
export async function deleteProxyGrant(granteeUsername: string): Promise<void> {
  logger.info(CONTEXT, `代理登録権限削除リクエスト送信: grantee=${granteeUsername}`);

  const response = await fetch(`${API_BASE}/events/proxy-grants/${granteeUsername}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || '代理登録権限の削除に失敗しました。';
    logger.warn(CONTEXT, `代理登録権限削除失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `代理登録権限削除成功: grantee=${granteeUsername}`);
}
