import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountsModule } from './accounts/module/account.module';
import { TaskModule } from './tasks/module/task.module';
import { EventsModule } from './events/events.module';
import { CommonModule } from './common/common.module';
import { LineNotificationService } from './line/line-notification.service';
import { LinkModule } from './links/link.module';
import { ChatModule } from './chat/chat.module';

/**
 * アプリケーションルートモジュール
 * ScheduleModule を forRoot() でインポートして Cron ジョブを有効化する
 * LineNotificationService は TaskModule のエクスポートする TaskNotificationRepository と
 * CommonModule のエクスポートする LoggerService を利用する
 * ThrottlerModule でレートリミットを設定する（デフォルト: 1分間に20リクエスト）
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    CommonModule,
    AccountsModule,
    TaskModule,
    EventsModule,
    LinkModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    LineNotificationService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
