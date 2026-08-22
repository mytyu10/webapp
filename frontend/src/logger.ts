import { sendLog } from './api/logApi';

const PREFIX = '[WebApp]';

/**
 * アプリケーション共通ロガー
 * ログレベルに応じてブラウザコンソールに統一フォーマットで出力する。
 * warn / error レベルは POST /log でバックエンドにも非同期送信する（失敗はサイレント）。
 */
export const logger = {
  /** 通常ログ（コンソールのみ） */
  info: (context: string, message: string): void => {
    console.log(`${PREFIX} [INFO] [${context}] ${message}`);
  },

  /** 警告ログ（コンソール + バックエンド送信） */
  warn: (context: string, message: string): void => {
    console.warn(`${PREFIX} [WARN] [${context}] ${message}`);
    sendLog('warn', context, message).catch(() => {
      // ログ送信失敗はユーザーに見せない
    });
  },

  /** エラーログ（コンソール + バックエンド送信） */
  error: (context: string, message: string, error?: unknown): void => {
    console.error(`${PREFIX} [ERROR] [${context}] ${message}`, error ?? '');
    const detail =
      error instanceof Error ? `: ${error.message}` : '';
    sendLog('error', context, `${message}${detail}`).catch(() => {
      // ログ送信失敗はユーザーに見せない
    });
  },
};
