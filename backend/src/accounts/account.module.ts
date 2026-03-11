import { Module } from '@nestjs/common';
import { AccountsController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  controllers: [AccountsController],
  providers: [AccountService]
})
export class AccountsModule {}
