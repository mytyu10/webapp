import { Module } from '@nestjs/common';
import { AccountsController } from './account.controller';
import { AccountsService } from './account.service';

@Module({
  controllers: [AccountsController],
  providers: [AccountsService]
})
export class AccountsModule {}
