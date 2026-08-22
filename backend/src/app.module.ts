import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountsModule } from './accounts/module/account.module';
import { TaskModule } from './tasks/module/task.module';
import { EventsModule } from './events/events.module';
import { CommonModule } from './common/common.module';
import { LinkModule } from './links/link.module';
import { ChatModule } from './chat/chat.module';
import { GitHubModule } from './github/github.module';
import { VoiceModule } from './voice/voice.module';
import { LogModule } from './log/log.module';

/**
 * アプリケーションルートモジュール
 * ThrottlerModule でレートリミットを設定する（デフォルト: 1分間に20リクエスト）
 * E2E テスト環境（THROTTLE_LIMIT 環境変数あり）ではレート制限を緩和する
 */
const throttleLimit = process.env.THROTTLE_LIMIT
  ? parseInt(process.env.THROTTLE_LIMIT, 10)
  : 20;
const throttleTtl = process.env.THROTTLE_TTL
  ? parseInt(process.env.THROTTLE_TTL, 10)
  : 60000;

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: throttleTtl, limit: throttleLimit }]),
    CommonModule,
    AccountsModule,
    TaskModule,
    EventsModule,
    LinkModule,
    ChatModule,
    GitHubModule,
    VoiceModule,
    LogModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
