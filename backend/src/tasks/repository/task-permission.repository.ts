import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PermissionType } from 'src/permissions/permission.dto';

/** TaskPermission レコード型 */
export interface TaskPermissionRecord {
  task_id: number;
  username: string;
  permission: PermissionType;
}

@Injectable()
export class TaskPermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 指定タスクの権限一覧を取得する
   */
  async findAll(taskId: number): Promise<TaskPermissionRecord[]> {
    const records = await this.prisma.taskPermission.findMany({
      where: { task_id: taskId },
      orderBy: { username: 'asc' },
    });
    return records as TaskPermissionRecord[];
  }

  /**
   * 指定タスク・ユーザーの権限を取得する。存在しない場合は null を返す
   */
  async findOne(
    taskId: number,
    username: string,
  ): Promise<TaskPermissionRecord | null> {
    const record = await this.prisma.taskPermission.findUnique({
      where: { task_id_username: { task_id: taskId, username } },
    });
    return record as TaskPermissionRecord | null;
  }

  /**
   * タスクへの権限を付与する（既存の場合はupsert）
   */
  async upsert(
    taskId: number,
    username: string,
    permission: PermissionType,
  ): Promise<TaskPermissionRecord> {
    const record = await this.prisma.taskPermission.upsert({
      where: { task_id_username: { task_id: taskId, username } },
      create: { task_id: taskId, username, permission },
      update: { permission },
    });
    return record as TaskPermissionRecord;
  }

  /**
   * タスクの権限を削除する
   */
  async delete(taskId: number, username: string): Promise<void> {
    await this.prisma.taskPermission.delete({
      where: { task_id_username: { task_id: taskId, username } },
    });
  }
}
