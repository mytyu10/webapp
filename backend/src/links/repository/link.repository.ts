import { Injectable } from '@nestjs/common';
import { LinkItem } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { LinkItemType } from '../dto/link.dto';

/** Prisma から取得する LinkItem の型エイリアス */
export type LinkItemRecord = LinkItem;

@Injectable()
export class LinkRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 指定ユーザーが作成者・権限付与済み（LinkPermission）であるリンク/フォルダをフラット配列で取得する。
   * order 昇順でソートする
   */
  async findAll(username: string): Promise<LinkItemRecord[]> {
    return this.prisma.linkItem.findMany({
      where: {
        OR: [{ created_by: username }, { permissions: { some: { username } } }],
      },
      orderBy: [{ order: 'asc' }, { created_at: 'asc' }],
    });
  }

  /**
   * 指定IDのリンク/フォルダを取得する。存在しない場合は null を返す
   */
  async findById(id: number): Promise<LinkItemRecord | null> {
    return this.prisma.linkItem.findUnique({ where: { id } });
  }

  /**
   * リンク/フォルダを作成する
   */
  async create(data: {
    title: string;
    url: string | null;
    description: string;
    type: LinkItemType;
    parent_id: number | null;
    order: number;
    created_by: string;
  }): Promise<LinkItemRecord> {
    return this.prisma.linkItem.create({ data });
  }

  /**
   * 指定IDのリンク/フォルダを更新する
   */
  async update(
    id: number,
    data: {
      title?: string;
      url?: string | null;
      description?: string;
      parent_id?: number | null;
      order?: number;
    },
  ): Promise<LinkItemRecord> {
    return this.prisma.linkItem.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...('parent_id' in data && { parent_id: data.parent_id }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
  }

  /**
   * 指定IDのリンク/フォルダを削除する。FOLDER の場合は Cascade により子も削除される
   */
  async delete(id: number): Promise<void> {
    await this.prisma.linkItem.delete({ where: { id } });
  }
}
