import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PermissionType } from 'src/permissions/permission.dto';

/** EventPermission レコード型 */
export interface EventPermissionRecord {
  event_id: number;
  username: string;
  permission: PermissionType;
}

@Injectable()
export class EventPermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 指定イベントの権限一覧を取得する
   */
  async findAll(eventId: number): Promise<EventPermissionRecord[]> {
    const records = await this.prisma.eventPermission.findMany({
      where: { event_id: eventId },
      orderBy: { username: 'asc' },
    });
    return records as EventPermissionRecord[];
  }

  /**
   * 指定イベント・ユーザーの権限を取得する。存在しない場合は null を返す
   */
  async findOne(
    eventId: number,
    username: string,
  ): Promise<EventPermissionRecord | null> {
    const record = await this.prisma.eventPermission.findUnique({
      where: { event_id_username: { event_id: eventId, username } },
    });
    return record as EventPermissionRecord | null;
  }

  /**
   * イベントへの権限を付与する（既存の場合はupsert）
   */
  async upsert(
    eventId: number,
    username: string,
    permission: PermissionType,
  ): Promise<EventPermissionRecord> {
    const record = await this.prisma.eventPermission.upsert({
      where: { event_id_username: { event_id: eventId, username } },
      create: { event_id: eventId, username, permission },
      update: { permission },
    });
    return record as EventPermissionRecord;
  }

  /**
   * イベントの権限を削除する
   */
  async delete(eventId: number, username: string): Promise<void> {
    await this.prisma.eventPermission.delete({
      where: { event_id_username: { event_id: eventId, username } },
    });
  }
}
