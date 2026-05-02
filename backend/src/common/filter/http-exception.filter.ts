import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { MESSAGE } from '../type/message';

/**
 * 全例外をキャッチしてクライアントへ { message: string } 形式で返すグローバルフィルター。
 * HttpException の場合はそのステータスコードとメッセージを使用する。
 * それ以外の例外（Prisma エラー等）は 500 として DB_ERROR メッセージを返す。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // class-validator が生成する BadRequestException のレスポンスを統一する
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as { message?: string | string[] }).message
            ? Array.isArray(
                (exceptionResponse as { message: string | string[] }).message,
              )
              ? ((exceptionResponse as { message: string[] }).message[0] ??
                MESSAGE.VALIDATION.INVALID_INPUT)
              : (exceptionResponse as { message: string }).message
            : MESSAGE.VALIDATION.INVALID_INPUT;

      response.status(status).json({ message });
      return;
    }

    // HttpException 以外（Prisma エラー等）は 500 で返す
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: MESSAGE.DB.DB_ERROR,
    });
  }
}
