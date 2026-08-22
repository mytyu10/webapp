import { Injectable } from '@nestjs/common';
import winston from 'winston';
import path from 'path';

/** ログファイルの出力先ディレクトリ（プロジェクトルートの logs/ 配下） */
const LOG_DIR = path.resolve(process.cwd(), 'logs');

/** Winston ロガーインスタンス（モジュールスコープでシングルトン） */
const winstonLogger = winston.createLogger({
  transports: [
    /** コンソール出力: 全レベル */
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ level, message }) => `[${level}] ${String(message)}`,
        ),
      ),
    }),
    /** ファイル出力: warn / error のみ */
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'app.log'),
      level: 'warn',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
});

/**
 * アプリケーション共通ロガー
 * Winston をラップし、統一されたログ出力を提供する。
 * warn / error レベルのログは logs/app.log にファイル出力する。
 */
@Injectable()
export class LoggerService {
  /** 通常ログ（コンソールのみ） */
  log(context: string, message: string): void {
    winstonLogger.info(`[${context}] ${message}`);
  }

  /** 警告ログ（コンソール + ファイル） */
  warn(context: string, message: string): void {
    winstonLogger.warn(`[${context}] ${message}`);
  }

  /** エラーログ（コンソール + ファイル） */
  error(context: string, message: string, trace?: string): void {
    winstonLogger.error(`[${context}] ${message}`, { trace: trace ?? null });
  }
}
