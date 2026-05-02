import { Injectable } from '@nestjs/common';
import { Account, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getAccount(username: string): Promise<Account | null> {
    return this.prisma.account.findUnique({
      where: { username },
    });
  }

  async createUser(data: Prisma.AccountCreateInput): Promise<Account> {
    return this.prisma.account.create({ data });
  }
}
