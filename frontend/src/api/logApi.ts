const { REACT_APP_API_SCHEME, REACT_APP_API_HOST, REACT_APP_API_PORT } =
  process.env;
const API_BASE = REACT_APP_API_HOST
  ? `${REACT_APP_API_SCHEME}://${REACT_APP_API_HOST}:${REACT_APP_API_PORT}`
  : '';

/** ログレベル */
export type LogLevel = 'warn' | 'error';

/** ログ送信ペイロード */
export interface LogPayload {
  level: LogLevel;
  context: string;
  message: string;
  timestamp: string;
}

/**
 * バックエンドの POST /log にログを送信する
 * JWT がない場合（未ログイン）はスキップする
 * 通信エラー・401 などは呼び出し元に例外を伝播させない（コンソール出力のみ）
 */
export async function sendLog(
  level: LogLevel,
  context: string,
  message: string,
): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) {
    // 未ログイン時はスキップ（ログ送信は認証必須）
    return;
  }

  const payload: LogPayload = {
    level,
    context,
    message,
    timestamp: new Date().toISOString(),
  };

  await fetch(`${API_BASE}/log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}
