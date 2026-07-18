import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

/** EventProxyGrant レコード型 */
export interface EventProxyGrantRecord {
  granter_username: string;
  grantee_username: string;
}

@Injectable()
export class EventProxyGrantRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 指定ユーザーが代理登録を許可しているユーザー（grantee）の一覧を取得する
   */
  async findAllGrantees(
    granterUsername: string,
  ): Promise<EventProxyGrantRecord[]> {
    return this.prisma.eventProxyGrant.findMany({
      where: { granter_username: granterUsername },
      orderBy: { grantee_username: 'asc' },
    });
  }

  /**
   * 指定ユーザーが代理登録できるユーザー（granter）の一覧を取得する
   */
  async findAllGranters(
    granteeUsername: string,
  ): Promise<EventProxyGrantRecord[]> {
    return this.prisma.eventProxyGrant.findMany({
      where: { grantee_username: granteeUsername },
      orderBy: { granter_username: 'asc' },
    });
  }

  /**
   * 1件取得する。存在しない場合は null を返す
   */
  async findOne(
    granterUsername: string,
    granteeUsername: string,
  ): Promise<EventProxyGrantRecord | null> {
    return this.prisma.eventProxyGrant.findUnique({
      where: {
        granter_username_grantee_username: {
          granter_username: granterUsername,
          grantee_username: granteeUsername,
        },
      },
    });
  }

  /**
   * 代理登録権限を付与する（既存の場合は何もしない upsert）
   */
  async upsert(
    granterUsername: string,
    granteeUsername: string,
  ): Promise<EventProxyGrantRecord> {
    return this.prisma.eventProxyGrant.upsert({
      where: {
        granter_username_grantee_username: {
          granter_username: granterUsername,
          grantee_username: granteeUsername,
        },
      },
      create: {
        granter_username: granterUsername,
        grantee_username: granteeUsername,
      },
      update: {},
    });
  }

  /**
   * 代理登録権限を削除する
   */
  async delete(
    granterUsername: string,
    granteeUsername: string,
  ): Promise<void> {
    await this.prisma.eventProxyGrant.delete({
      where: {
        granter_username_grantee_username: {
          granter_username: granterUsername,
          grantee_username: granteeUsername,
        },
      },
    });
  }
}
