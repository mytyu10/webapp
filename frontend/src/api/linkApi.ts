import { logger } from '../logger';

const { REACT_APP_API_SCHEME, REACT_APP_API_HOST, REACT_APP_API_PORT } = process.env;
const API_BASE = REACT_APP_API_HOST
  ? `${REACT_APP_API_SCHEME}://${REACT_APP_API_HOST}:${REACT_APP_API_PORT}`
  : '';
const CONTEXT = 'linkApi';

/** LinkItem のタイプ */
export type LinkItemType = 'FOLDER' | 'LINK';

/** リンク/フォルダのレスポンス型 */
export interface LinkItem {
  id: number;
  title: string;
  /** URL（LINK タイプのみ値あり、FOLDER は null） */
  url: string | null;
  description: string;
  /** タイプ（FOLDER または LINK） */
  type: LinkItemType;
  /** 親フォルダID（ルート直下は null） */
  parent_id: number | null;
  order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  /** 子要素（FOLDER のみ持つ。LINK は常に空配列） */
  children: LinkItem[];
}

/** リンク/フォルダ作成・更新リクエスト型 */
export interface LinkItemInput {
  title: string;
  url?: string;
  description?: string;
  type: LinkItemType;
  parent_id?: number;
  order?: number;
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
 * リンク/フォルダ一覧をツリー構造で取得する
 */
export async function fetchLinks(): Promise<LinkItem[]> {
  logger.info(CONTEXT, 'リンク一覧取得リクエスト送信');

  const response = await fetch(`${API_BASE}/links`, {
    method: 'GET',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || 'リンクの取得に失敗しました。';
    logger.warn(CONTEXT, `リンク一覧取得失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, 'リンク一覧取得成功');
  return (await response.json()) as LinkItem[];
}

/**
 * リンク/フォルダを作成する
 */
export async function createLink(input: LinkItemInput): Promise<LinkItem> {
  logger.info(CONTEXT, `リンク作成リクエスト送信: ${input.title}`);

  const response = await fetch(`${API_BASE}/links`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || 'リンクの作成に失敗しました。';
    logger.warn(CONTEXT, `リンク作成失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, 'リンク作成成功');
  const data = (await response.json()) as { message: string; link: LinkItem };
  return data.link;
}

/**
 * リンク/フォルダを更新する
 */
export async function updateLink(id: number, input: Partial<LinkItemInput>): Promise<LinkItem> {
  logger.info(CONTEXT, `リンク更新リクエスト送信: id=${id}`);

  const response = await fetch(`${API_BASE}/links/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || 'リンクの更新に失敗しました。';
    logger.warn(CONTEXT, `リンク更新失敗: id=${id} - ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `リンク更新成功: id=${id}`);
  const data = (await response.json()) as { message: string; link: LinkItem };
  return data.link;
}

/**
 * リンク/フォルダを削除する
 */
export async function deleteLink(id: number): Promise<void> {
  logger.info(CONTEXT, `リンク削除リクエスト送信: id=${id}`);

  const response = await fetch(`${API_BASE}/links/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || 'リンクの削除に失敗しました。';
    logger.warn(CONTEXT, `リンク削除失敗: id=${id} - ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `リンク削除成功: id=${id}`);
}
