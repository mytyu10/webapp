import { Navigate, Outlet } from 'react-router-dom';
import { logger } from '../logger';

const CONTEXT = 'PrivateRoute';

/** JWTペイロードの型（expフィールドのみ使用） */
interface JwtPayloadDecoded {
  exp?: number;
}

/**
 * JWTのペイロード部分をBase64デコードしてパースする
 * デコード失敗時はnullを返す
 */
function decodeJwtPayload(token: string): JwtPayloadDecoded | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = atob(payloadBase64);
    return JSON.parse(payloadJson) as JwtPayloadDecoded;
  } catch {
    logger.warn(CONTEXT, 'JWTのデコードに失敗しました');
    return null;
  }
}

/**
 * JWT有効期限チェック
 * トークンが存在しない・不正・期限切れの場合はfalseを返す
 */
function isTokenValid(token: string | null): boolean {
  if (!token) return false;

  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;

  /** UNIXタイムスタンプ（秒）と現在時刻を比較 */
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp > nowInSeconds;
}

/**
 * 認証済みルート保護コンポーネント
 * JWTの存在チェックとexpによる有効期限検証を行い、
 * 未認証・期限切れの場合は/loginへリダイレクトする
 */
function PrivateRoute() {
  const token = localStorage.getItem('token');

  if (!isTokenValid(token)) {
    logger.warn(CONTEXT, 'トークンが無効または期限切れです。ログイン画面へリダイレクト');
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default PrivateRoute;
