import { Module } from '@nestjs/common';
import { AccountsController } from './account.controller';
import { AccountService } from './account.service';
import { HashService } from 'src/common/service/hash.service';

@Module({
  controllers: [AccountsController],
  providers: [AccountService, HashService]
})
export class AccountsModule {}
