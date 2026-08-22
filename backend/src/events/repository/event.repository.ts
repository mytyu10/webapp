import { Injectable } from '@nestjs/common';
import { Event, EventPermission, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

/** EventPermission を含む Event 型 */
export type EventWithPermissions = Event & {
  permissions: EventPermission[];
};

@Injectable()
export class EventRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 指定ユーザーが作成者または権限付与済みである予定を開始日時の昇順で取得する
   */
  async findAll(username: string): Promise<EventWithPermissions[]> {
    return this.prisma.event.findMany({
      where: {
        OR: [{ created_by: username }, { permissions: { some: { username } } }],
      },
      include: {
        permissions: true,
      },
      orderBy: { start_at: 'asc' },
    });
  }

  /**
   * 指定IDの予定を権限一覧込みで取得する。存在しない場合はnullを返す
   */
  async findById(id: number): Promise<EventWithPermissions | null> {
    return this.prisma.event.findUnique({
      where: { id },
      include: {
        permissions: true,
      },
    });
  }

  /**
   * 指定された繰り返しグループIDに属する全予定を開始日時の昇順で取得する
   */
  async findByRepeatGroupId(repeatGroupId: string): Promise<Event[]> {
    return this.prisma.event.findMany({
      where: { repeat_group_id: repeatGroupId },
      orderBy: { start_at: 'asc' },
    });
  }

  /**
   * 予定を作成する。Prismaの生成する型（EventUncheckedCreateInput）を使用して型の乖離を防ぐ
   */
  async create(
    data: Prisma.EventUncheckedCreateInput,
  ): Promise<EventWithPermissions> {
    return this.prisma.event.create({
      data,
      include: { permissions: true },
    });
  }

  /**
   * 複数予定を一括作成する。
   * SQLite では createMany の戻り値が count のみで個別IDが取れないため、
   * $transaction + 個別 create の配列実行で全件レコードを返す
   */
  async createMany(
    data: Prisma.EventUncheckedCreateInput[],
  ): Promise<EventWithPermissions[]> {
    return this.prisma.$transaction(
      data.map((item) =>
        this.prisma.event.create({
          data: item,
          include: { permissions: true },
        }),
      ),
    );
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
      color?: string;
    },
  ): Promise<EventWithPermissions> {
    return this.prisma.event.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.start_at !== undefined && { start_at: data.start_at }),
        ...(data.end_at !== undefined && { end_at: data.end_at }),
        ...(data.color !== undefined && { color: data.color }),
      },
      include: { permissions: true },
    });
  }

  /**
   * 複数の予定を一括更新する。
   * $transaction + 個別 update で全件を更新する
   */
  async updateMany(
    updates: Array<{
      id: number;
      data: {
        title?: string;
        description?: string;
        start_at?: Date;
        end_at?: Date;
        color?: string;
      };
    }>,
  ): Promise<EventWithPermissions[]> {
    return this.prisma.$transaction(
      updates.map(({ id, data }) =>
        this.prisma.event.update({
          where: { id },
          data: {
            ...(data.title !== undefined && { title: data.title }),
            ...(data.description !== undefined && {
              description: data.description,
            }),
            ...(data.start_at !== undefined && { start_at: data.start_at }),
            ...(data.end_at !== undefined && { end_at: data.end_at }),
            ...(data.color !== undefined && { color: data.color }),
          },
          include: { permissions: true },
        }),
      ),
    );
  }

  /**
   * 指定IDの予定を削除する
   */
  async delete(id: number): Promise<void> {
    await this.prisma.event.delete({ where: { id } });
  }
}
