import { logger } from '../logger';

const { REACT_APP_API_SCHEME, REACT_APP_API_HOST, REACT_APP_API_PORT } = process.env;
const API_BASE = `${REACT_APP_API_SCHEME}://${REACT_APP_API_HOST}:${REACT_APP_API_PORT}`;
const CONTEXT = 'accountApi';

/**
 * ログインAPIリクエスト
 * 成功時はJWTトークンを返す
 */
export async function loginRequest(username: string, password: string): Promise<string> {
  logger.info(CONTEXT, `ログインリクエスト送信: ${username}`);

  const response = await fetch(`${API_BASE}/accounts/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data.message || 'ログインに失敗しました。';
    logger.warn(CONTEXT, `ログイン失敗: ${username} - ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `ログイン成功: ${username}`);
  const data = await response.json();
  return data.token;
}

/**
 * アカウント登録APIリクエスト
 * 成功時は何も返さない（201 Created）
 */
export async function registRequest(username: string, password: string): Promise<void> {
  logger.info(CONTEXT, `アカウント登録リクエスト送信: ${username}`);

  const response = await fetch(`${API_BASE}/accounts/regist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data.message || 'アカウントの登録に失敗しました。';
    logger.warn(CONTEXT, `アカウント登録失敗: ${username} - ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `アカウント登録成功: ${username}`);
}
