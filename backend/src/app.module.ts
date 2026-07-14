import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
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
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    CommonModule,
    AccountsModule,
    TaskModule,
    EventsModule,
    LinkModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService, LineNotificationService],
})
export class AppModule {}
