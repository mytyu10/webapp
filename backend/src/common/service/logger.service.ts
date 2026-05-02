import { Injectable, Logger } from '@nestjs/common';

/**
 * アプリケーション共通ロガー
 * NestJS の Logger をラップし、統一されたログ出力を提供する
 */
@Injectable()
export class LoggerService {
  private readonly logger = new Logger();

  /** 通常ログ */
  log(context: string, message: string): void {
    this.logger.log(message, context);
  }

  /** 警告ログ */
  warn(context: string, message: string): void {
    this.logger.warn(message, context);
  }

  /** エラーログ */
  error(context: string, message: string, trace?: string): void {
    this.logger.error(message, trace, context);
  }
}
