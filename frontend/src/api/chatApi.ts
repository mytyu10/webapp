import { logger } from '../logger';

const { REACT_APP_API_SCHEME, REACT_APP_API_HOST, REACT_APP_API_PORT } = process.env;
const API_BASE = REACT_APP_API_HOST
  ? `${REACT_APP_API_SCHEME}://${REACT_APP_API_HOST}:${REACT_APP_API_PORT}`
  : '';
const CONTEXT = 'chatApi';

/** チャットメッセージの型 */
export interface ChatMessage {
  id: number;
  from_user: string;
  to_user: string;
  content: string;
  created_at: string;
}

/** チャット相手の型 */
export interface ChatContact {
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
 * やり取りしたことのある相手ユーザー一覧を取得する
 */
export async function fetchContacts(): Promise<ChatContact[]> {
  logger.info(CONTEXT, 'チャット相手一覧取得リクエスト送信');

  const response = await fetch(`${API_BASE}/chat/contacts`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || 'チャット相手一覧の取得に失敗しました。';
    logger.warn(CONTEXT, `チャット相手一覧取得失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, 'チャット相手一覧取得成功');
  return (await response.json()) as ChatContact[];
}

/**
 * 全ユーザー一覧を取得する（チャット相手選択用）
 */
export async function fetchAllUsers(): Promise<ChatContact[]> {
  logger.info(CONTEXT, '全ユーザー一覧取得リクエスト送信');

  const response = await fetch(`${API_BASE}/chat/users`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || 'ユーザー一覧の取得に失敗しました。';
    logger.warn(CONTEXT, `全ユーザー一覧取得失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, '全ユーザー一覧取得成功');
  return (await response.json()) as ChatContact[];
}

/**
 * 2ユーザー間のメッセージ一覧を取得する
 */
export async function fetchMessages(withUser: string): Promise<ChatMessage[]> {
  logger.info(CONTEXT, `メッセージ一覧取得リクエスト送信: with=${withUser}`);

  const response = await fetch(`${API_BASE}/chat/messages?with=${encodeURIComponent(withUser)}`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || 'メッセージの取得に失敗しました。';
    logger.warn(CONTEXT, `メッセージ一覧取得失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, 'メッセージ一覧取得成功');
  return (await response.json()) as ChatMessage[];
}

/**
 * メッセージを送信する
 */
export async function sendMessage(toUser: string, content: string): Promise<ChatMessage> {
  logger.info(CONTEXT, `メッセージ送信リクエスト送信: to=${toUser}`);

  const response = await fetch(`${API_BASE}/chat/messages`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ to_user: toUser, content }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || 'メッセージの送信に失敗しました。';
    logger.warn(CONTEXT, `メッセージ送信失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, 'メッセージ送信成功');
  const data = (await response.json()) as { message: string; data: ChatMessage };
  return data.data;
}
