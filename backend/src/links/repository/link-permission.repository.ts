import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PermissionType } from 'src/permissions/permission.dto';

/** LinkPermission レコード型 */
export interface LinkPermissionRecord {
  link_item_id: number;
  username: string;
  permission: PermissionType;
}

@Injectable()
export class LinkPermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 指定リンクアイテムの権限一覧を取得する
   */
  async findAll(linkItemId: number): Promise<LinkPermissionRecord[]> {
    const records = await this.prisma.linkPermission.findMany({
      where: { link_item_id: linkItemId },
      orderBy: { username: 'asc' },
    });
    return records as LinkPermissionRecord[];
  }

  /**
   * 指定リンクアイテム・ユーザーの権限を取得する。存在しない場合は null を返す
   */
  async findOne(
    linkItemId: number,
    username: string,
  ): Promise<LinkPermissionRecord | null> {
    const record = await this.prisma.linkPermission.findUnique({
      where: {
        link_item_id_username: { link_item_id: linkItemId, username },
      },
    });
    return record as LinkPermissionRecord | null;
  }

  /**
   * リンクアイテムへの権限を付与する（既存の場合はupsert）
   */
  async upsert(
    linkItemId: number,
    username: string,
    permission: PermissionType,
  ): Promise<LinkPermissionRecord> {
    const record = await this.prisma.linkPermission.upsert({
      where: {
        link_item_id_username: { link_item_id: linkItemId, username },
      },
      create: { link_item_id: linkItemId, username, permission },
      update: { permission },
    });
    return record as LinkPermissionRecord;
  }

  /**
   * リンクアイテムの権限を削除する
   */
  async delete(linkItemId: number, username: string): Promise<void> {
    await this.prisma.linkPermission.delete({
      where: {
        link_item_id_username: { link_item_id: linkItemId, username },
      },
    });
  }
}
