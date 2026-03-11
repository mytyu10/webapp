import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountsModule } from './accounts/account.module';

@Module({
  imports: [AccountsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
