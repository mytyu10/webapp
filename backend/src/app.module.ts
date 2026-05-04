import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountsModule } from './accounts/module/account.module';
import { TaskModule } from './tasks/module/task.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [AccountsModule, TaskModule, EventsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
