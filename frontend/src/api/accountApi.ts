import { logger } from '../logger';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';

const { REACT_APP_API_SCHEME, REACT_APP_API_HOST, REACT_APP_API_PORT } = process.env;
const API_BASE = REACT_APP_API_HOST
  ? `${REACT_APP_API_SCHEME}://${REACT_APP_API_HOST}:${REACT_APP_API_PORT}`
  : '';
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

// ─── WebAuthn API ─────────────────────────────────────────────────────────────

/**
 * 顔認証登録開始：サーバーから登録オプションを取得する
 */
export async function startWebAuthnRegistration(
  username: string,
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  logger.info(CONTEXT, `顔認証登録開始リクエスト: ${username}`);

  const response = await fetch(`${API_BASE}/accounts/webauthn/registration/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data.message || '顔認証の登録を開始できませんでした。';
    logger.warn(CONTEXT, `顔認証登録開始失敗: ${username} - ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `顔認証登録オプション取得成功: ${username}`);
  return response.json();
}

/**
 * 顔認証登録完了：ブラウザの登録レスポンスをサーバーに送信する
 */
export async function finishWebAuthnRegistration(
  username: string,
  registrationResponse: RegistrationResponseJSON,
): Promise<void> {
  logger.info(CONTEXT, `顔認証登録完了リクエスト: ${username}`);

  const response = await fetch(`${API_BASE}/accounts/webauthn/registration/finish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, response: registrationResponse }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data.message || '顔認証の登録に失敗しました。';
    logger.warn(CONTEXT, `顔認証登録失敗: ${username} - ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `顔認証登録成功: ${username}`);
}

/**
 * 顔認証開始：サーバーから認証オプションを取得する
 */
export async function startWebAuthnAuthentication(
  username: string,
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  logger.info(CONTEXT, `顔認証開始リクエスト: ${username}`);

  const response = await fetch(`${API_BASE}/accounts/webauthn/authentication/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data.message || '顔認証を開始できませんでした。';
    logger.warn(CONTEXT, `顔認証開始失敗: ${username} - ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `顔認証オプション取得成功: ${username}`);
  return response.json();
}

/**
 * 顔認証完了：ブラウザの認証レスポンスをサーバーに送信してJWTを取得する
 */
export async function finishWebAuthnAuthentication(
  username: string,
  authenticationResponse: AuthenticationResponseJSON,
): Promise<string> {
  logger.info(CONTEXT, `顔認証完了リクエスト: ${username}`);

  const response = await fetch(`${API_BASE}/accounts/webauthn/authentication/finish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, response: authenticationResponse }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data.message || '顔認証による認証に失敗しました。';
    logger.warn(CONTEXT, `顔認証失敗: ${username} - ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, `顔認証成功: ${username}`);
  const data = await response.json();
  return data.token;
}
