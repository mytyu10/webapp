import { Module } from '@nestjs/common';
import { AccountsController } from '../controller/account.controller';
import { AccountService } from '../service/account.service';
import { HashService } from 'src/common/service/hash.service';
import { LoggerService } from 'src/common/service/logger.service';
import { JwtService } from 'src/jwt/jwt.service';
import { AccountRepository } from '../repository/account.repository';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * アカウント管理モジュール
 */
@Module({
  controllers: [AccountsController],
  providers: [
    AccountService,
    HashService,
    JwtService,
    AccountRepository,
    PrismaService,
    LoggerService,
  ],
})
export class AccountsModule {}
