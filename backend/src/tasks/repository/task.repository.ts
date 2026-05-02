import { Injectable } from '@nestjs/common';
import { Task, TaskAssignee } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

/** タスクとアサイニーを含む型 */
export type TaskWithAssignees = Task & { assignees: TaskAssignee[] };

@Injectable()
export class TaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 全タスクを担当者情報込みで取得する
   */
  async findAll(): Promise<TaskWithAssignees[]> {
    return this.prisma.task.findMany({
      include: { assignees: true },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * 指定IDのタスクを担当者情報込みで取得する
   */
  async findById(id: number): Promise<TaskWithAssignees | null> {
    return this.prisma.task.findUnique({
      where: { id },
      include: { assignees: true },
    });
  }

  /**
   * タスクを作成し、担当者を一括登録する
   */
  async create(data: {
    title: string;
    description: string;
    due_date: Date;
    assignees: string[];
  }): Promise<TaskWithAssignees> {
    return this.prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        due_date: data.due_date,
        assignees: {
          create: data.assignees.map((username) => ({ username })),
        },
      },
      include: { assignees: true },
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
      assignees?: string[];
    },
  ): Promise<TaskWithAssignees> {
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
          ...(data.assignees !== undefined && {
            assignees: {
              create: data.assignees.map((username) => ({ username })),
            },
          }),
        },
        include: { assignees: true },
      });
    });
  }

  /**
   * 指定IDのタスクを削除する
   */
  async delete(id: number): Promise<void> {
    await this.prisma.task.delete({ where: { id } });
  }
}
