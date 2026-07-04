import { Injectable } from '@nestjs/common';
import { Event, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class EventRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 全予定を開始日時の昇順で取得する
   */
  async findAll(): Promise<Event[]> {
    return this.prisma.event.findMany({
      orderBy: { start_at: 'asc' },
    });
  }

  /**
   * 指定IDの予定を取得する。存在しない場合はnullを返す
   */
  async findById(id: number): Promise<Event | null> {
    return this.prisma.event.findUnique({
      where: { id },
    });
  }

  /**
   * 予定を作成する。Prismaの生成する型（EventUncheckedCreateInput）を使用して型の乖離を防ぐ
   */
  async create(data: Prisma.EventUncheckedCreateInput): Promise<Event> {
    return this.prisma.event.create({ data });
  }

  /**
   * 指定IDの予定を更新する
   */
  async update(
    id: number,
    data: {
      title?: string;
      description?: string;
      start_at?: Date;
      end_at?: Date;
    },
  ): Promise<Event> {
    return this.prisma.event.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.start_at !== undefined && { start_at: data.start_at }),
        ...(data.end_at !== undefined && { end_at: data.end_at }),
      },
    });
  }

  /**
   * 指定IDの予定を削除する
   */
  async delete(id: number): Promise<void> {
    await this.prisma.event.delete({ where: { id } });
  }
}
