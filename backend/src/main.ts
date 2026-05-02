import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filter/http-exception.filter';
import { MESSAGE } from './common/type/message';

/**
 * アプリケーション起動エントリーポイント。
 * 環境変数ガード・グローバルパイプ・グローバルフィルターを設定してから起動する。
 */
async function bootstrap() {
  // 必須環境変数が未設定の場合は起動を中断する
  if (!process.env.JWT_SECRET) {
    throw new Error('環境変数 JWT_SECRET が設定されていません');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('環境変数 DATABASE_URL が設定されていません');
  }

  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  // class-validator によるバリデーションパイプ（エラー時は日本語メッセージを返す）
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      exceptionFactory: () =>
        new BadRequestException(MESSAGE.VALIDATION.INVALID_INPUT),
    }),
  );

  // 全例外を { message: string } 形式に統一するグローバルフィルター
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(process.env.PORT ?? 8000);
}
void bootstrap();
