const PREFIX = '[WebApp]';

/**
 * アプリケーション共通ロガー
 * ログレベルに応じてブラウザコンソールに統一フォーマットで出力する
 */
export const logger = {
  /** 通常ログ */
  info: (context: string, message: string): void => {
    console.log(`${PREFIX} [INFO] [${context}] ${message}`);
  },

  /** 警告ログ */
  warn: (context: string, message: string): void => {
    console.warn(`${PREFIX} [WARN] [${context}] ${message}`);
  },

  /** エラーログ */
  error: (context: string, message: string, error?: unknown): void => {
    console.error(`${PREFIX} [ERROR] [${context}] ${message}`, error ?? '');
  },
};
