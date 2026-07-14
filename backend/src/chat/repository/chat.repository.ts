import { Injectable } from '@nestjs/common';
import { ChatMessage } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

/** Prisma から取得する ChatMessage の型エイリアス */
export type ChatMessageRecord = ChatMessage;

@Injectable()
export class ChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 2ユーザー間のメッセージ一覧を取得する（created_at 昇順）
   */
  async findConversation(
    userA: string,
    userB: string,
  ): Promise<ChatMessageRecord[]> {
    return this.prisma.chatMessage.findMany({
      where: {
        OR: [
          { from_user: userA, to_user: userB },
          { from_user: userB, to_user: userA },
        ],
      },
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * メッセージを送信する（DBに保存する）
   */
  async create(data: {
    from_user: string;
    to_user: string;
    content: string;
  }): Promise<ChatMessageRecord> {
    return this.prisma.chatMessage.create({ data });
  }

  /**
   * 指定ユーザーがやり取りしたことのある相手のユーザー名一覧を取得する（重複なし）
   */
  async findContacts(username: string): Promise<string[]> {
    const sent = await this.prisma.chatMessage.findMany({
      where: { from_user: username },
      select: { to_user: true },
      distinct: ['to_user'],
    });

    const received = await this.prisma.chatMessage.findMany({
      where: { to_user: username },
      select: { from_user: true },
      distinct: ['from_user'],
    });

    const contactSet = new Set<string>();
    for (const m of sent) contactSet.add(m.to_user);
    for (const m of received) contactSet.add(m.from_user);

    return Array.from(contactSet).sort();
  }
}
