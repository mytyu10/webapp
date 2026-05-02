import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountsModule } from './accounts/module/account.module';
import { TaskModule } from './tasks/module/task.module';

@Module({
  imports: [AccountsModule, TaskModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
