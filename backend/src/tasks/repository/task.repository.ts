import { Injectable } from '@nestjs/common';
import { Task, TaskAssignee, TaskNotification } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { Priority } from '../dto/task.dto';

/** タスクとアサイニー・子タスク・通知を含む型 */
export type TaskWithRelations = Task & {
  assignees: TaskAssignee[];
  children: (Task & {
    assignees: TaskAssignee[];
    notifications: TaskNotification[];
  })[];
  notifications: TaskNotification[];
};

@Injectable()
export class TaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 指定ユーザーが作成者・担当者・権限付与済み（TaskPermission）であるタスクを
   * 担当者・子タスク・通知情報込みで取得する。子タスクは一覧に含めない
   */
  async findAll(username: string): Promise<TaskWithRelations[]> {
    return this.prisma.task.findMany({
      where: {
        parent_id: null,
        OR: [
          { created_by: username },
          { assignees: { some: { username } } },
          { permissions: { some: { username } } },
        ],
      },
      include: {
        assignees: true,
        notifications: { orderBy: { notify_at: 'asc' } },
        children: {
          include: {
            assignees: true,
            notifications: { orderBy: { notify_at: 'asc' } },
          },
        },
      },
      orderBy: { due_date: 'asc' },
    });
  }

  /**
   * 指定IDのタスクを担当者・子タスク・通知情報込みで取得する
   */
  async findById(id: number): Promise<TaskWithRelations | null> {
    return this.prisma.task.findUnique({
      where: { id },
      include: {
        assignees: true,
        notifications: { orderBy: { notify_at: 'asc' } },
        children: {
          include: {
            assignees: true,
            notifications: { orderBy: { notify_at: 'asc' } },
          },
        },
      },
    });
  }

  /**
   * タスクを作成し、担当者を一括登録する
   */
  async create(data: {
    title: string;
    description: string;
    due_date: Date;
    priority: Priority;
    category: string | null;
    parent_id: number | null;
    created_by: string;
    assignees: string[];
  }): Promise<TaskWithRelations> {
    return this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        due_date: data.due_date,
        priority: data.priority,
        category: data.category,
        parent_id: data.parent_id,
        created_by: data.created_by,
        assignees: {
          create: data.assignees.map((username) => ({ username })),
        },
      },
      include: {
        assignees: true,
        notifications: { orderBy: { notify_at: 'asc' } },
        children: {
          include: {
            assignees: true,
            notifications: { orderBy: { notify_at: 'asc' } },
          },
        },
      },
    });
  }

  /**
   * タスクを更新する。担当者は既存を削除してから再登録する
   */
  async update(
    id: number,
    data: {
      title?: string;
      description?: string;
      due_date?: Date;
      priority?: Priority;
      category?: string;
      parent_id?: number;
      assignees?: string[];
      is_completed?: boolean;
      closed_by?: string | null;
    },
  ): Promise<TaskWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      if (data.assignees !== undefined) {
        await tx.taskAssignee.deleteMany({ where: { task_id: id } });
      }

      return tx.task.update({
        where: { id },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.due_date !== undefined && { due_date: data.due_date }),
          ...(data.priority !== undefined && { priority: data.priority }),
          ...(data.category !== undefined && { category: data.category }),
          ...(data.parent_id !== undefined && { parent_id: data.parent_id }),
          ...(data.is_completed !== undefined && {
            is_completed: data.is_completed,
          }),
          ...('closed_by' in data && { closed_by: data.closed_by }),
          ...(data.assignees !== undefined && {
            assignees: {
              create: data.assignees.map((username) => ({ username })),
            },
          }),
        },
        include: {
          assignees: true,
          notifications: { orderBy: { notify_at: 'asc' } },
          children: {
            include: {
              assignees: true,
              notifications: { orderBy: { notify_at: 'asc' } },
            },
          },
        },
      });
    });
  }

  /**
   * 指定IDのタスクを削除する
   */
  async delete(id: number): Promise<void> {
    await this.prisma.task.delete({ where: { id } });
  }

  /**
   * 指定ユーザーが作成者・担当者・権限付与済みであるタスクから設定されているカテゴリ一覧を重複なしで取得する
   */
  async findAllCategories(username: string): Promise<string[]> {
    const tasks = await this.prisma.task.findMany({
      where: {
        category: { not: null },
        OR: [
          { created_by: username },
          { assignees: { some: { username } } },
          { permissions: { some: { username } } },
        ],
      },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return tasks.map((t) => t.category).filter((c): c is string => c !== null);
  }
}
