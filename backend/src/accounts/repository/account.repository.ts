import { Injectable } from '@nestjs/common';
import { Account, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ユーザー名でアカウントを取得する
   */
  async getAccount(username: string): Promise<Account | null> {
    return this.prisma.account.findUnique({
      where: { username },
    });
  }

  /**
   * 新規アカウントを作成する
   */
  async createUser(data: Prisma.AccountCreateInput): Promise<Account> {
    return this.prisma.account.create({ data });
  }

  /**
   * アカウントの LINE User ID を更新する
   */
  async updateLineUserId(
    username: string,
    lineUserId: string,
  ): Promise<Account> {
    return this.prisma.account.update({
      where: { username },
      data: { line_user_id: lineUserId },
    });
  }
}
