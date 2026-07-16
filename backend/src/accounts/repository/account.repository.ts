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
   * 全アカウント一覧を取得する（username 昇順）
   */
  async findAll(): Promise<Account[]> {
    return this.prisma.account.findMany({
      orderBy: { username: 'asc' },
    });
  }

  /**
   * 新規アカウントを作成する
   */
  async createUser(data: Prisma.AccountCreateInput): Promise<Account> {
    return this.prisma.account.create({ data });
  }
}
