import { Injectable } from '@nestjs/common';
import { TaskNotification, TaskAssignee, Account } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

/** 担当者と LINE User ID を含む通知の型 */
export type PendingNotificationWithAssignees = TaskNotification & {
  task: {
    id: number;
    title: string;
    due_date: Date;
    assignees: (TaskAssignee & { account: Account })[];
  };
};

@Injectable()
export class TaskNotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * タスクに通知を追加する
   */
  async create(taskId: number, notifyAt: Date): Promise<TaskNotification> {
    return this.prisma.taskNotification.create({
      data: {
        task_id: taskId,
        notify_at: notifyAt,
      },
    });
  }

  /**
   * 指定タスクの通知一覧を取得する
   */
  async findByTaskId(taskId: number): Promise<TaskNotification[]> {
    return this.prisma.taskNotification.findMany({
      where: { task_id: taskId },
      orderBy: { notify_at: 'asc' },
    });
  }

  /**
   * 指定IDかつ指定タスクに属する通知を削除する。
   * 削除件数を返す（0の場合は通知が存在しないかタスクに属していない）
   */
  async delete(notificationId: number, taskId: number): Promise<number> {
    const result = await this.prisma.taskNotification.deleteMany({
      where: { id: notificationId, task_id: taskId },
    });
    return result.count;
  }

  /**
   * 送信対象の通知を取得する
   * notify_at が現在時刻以前かつ is_sent が false の通知を担当者情報込みで返す
   */
  async findPendingNotifications(): Promise<
    PendingNotificationWithAssignees[]
  > {
    return this.prisma.taskNotification.findMany({
      where: {
        is_sent: false,
        notify_at: { lte: new Date() },
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            due_date: true,
            assignees: {
              include: { account: true },
            },
          },
        },
      },
    });
  }

  /**
   * 通知を送信済みにマークする
   */
  async markAsSent(notificationId: number): Promise<void> {
    await this.prisma.taskNotification.update({
      where: { id: notificationId },
      data: { is_sent: true },
    });
  }
}
