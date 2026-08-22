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
   * 全アカウント一覧を取得する（username 昇順）。
   * hashed_password は返さない
   */
  async findAll(): Promise<
    { username: string; display_name: string | null }[]
  > {
    return this.prisma.account.findMany({
      select: { username: true, display_name: true },
      orderBy: { username: 'asc' },
    });
  }

  /**
   * 新規アカウントを作成する
   */
  async createUser(data: Prisma.AccountCreateInput): Promise<Account> {
    return this.prisma.account.create({ data });
  }

  /**
   * 表示名を更新する
   * displayName に null を渡すと表示名を削除する
   */
  async updateDisplayName(
    username: string,
    displayName: string | null | undefined,
  ): Promise<Account> {
    return this.prisma.account.update({
      where: { username },
      data: { display_name: displayName ?? null },
    });
  }
}
