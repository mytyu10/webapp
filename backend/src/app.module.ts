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

/**
 * アプリケーションルートモジュール
 * ThrottlerModule でレートリミットを設定する（デフォルト: 1分間に20リクエスト）
 */
@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    CommonModule,
    AccountsModule,
    TaskModule,
    EventsModule,
    LinkModule,
    ChatModule,
    GitHubModule,
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
