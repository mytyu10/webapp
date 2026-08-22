import { Test, TestingModule } from '@nestjs/testing';
import { ChatRepository } from './chat.repository';
import { PrismaService } from 'src/prisma/prisma.service';

/** モック用メッセージデータ */
const mockChatMessage = {
  id: 1,
  from_user: 'alice',
  to_user: 'bob',
  content: 'こんにちは',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
};

/** PrismaService のモック */
const mockPrismaService = {
  chatMessage: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

describe('ChatRepository', () => {
  let repository: ChatRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get<ChatRepository>(ChatRepository);
    jest.clearAllMocks();
  });

  // ────────────────────────────────────────────────
  // findConversation
  // ────────────────────────────────────────────────
  describe('findConversation', () => {
    it('prisma.chatMessage.findMany を OR 条件と created_at 昇順で呼び出す', async () => {
      mockPrismaService.chatMessage.findMany.mockResolvedValue([
        mockChatMessage,
      ]);

      await repository.findConversation('alice', 'bob');

      expect(mockPrismaService.chatMessage.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { from_user: 'alice', to_user: 'bob' },
            { from_user: 'bob', to_user: 'alice' },
          ],
        },
        orderBy: { created_at: 'asc' },
      });
    });

    it('メッセージ一覧を返す', async () => {
      mockPrismaService.chatMessage.findMany.mockResolvedValue([
        mockChatMessage,
      ]);

      const result = await repository.findConversation('alice', 'bob');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('メッセージが存在しない場合は空配列を返す', async () => {
      mockPrismaService.chatMessage.findMany.mockResolvedValue([]);

      const result = await repository.findConversation('alice', 'bob');

      expect(result).toHaveLength(0);
    });
  });

  // ────────────────────────────────────────────────
  // create
  // ────────────────────────────────────────────────
  describe('create', () => {
    it('prisma.chatMessage.create を正しいデータで呼び出す', async () => {
      mockPrismaService.chatMessage.create.mockResolvedValue(mockChatMessage);

      const data = {
        from_user: 'alice',
        to_user: 'bob',
        content: 'こんにちは',
      };
      await repository.create(data);

      expect(mockPrismaService.chatMessage.create).toHaveBeenCalledWith({
        data,
      });
    });

    it('作成されたメッセージを返す', async () => {
      mockPrismaService.chatMessage.create.mockResolvedValue(mockChatMessage);

      const result = await repository.create({
        from_user: 'alice',
        to_user: 'bob',
        content: 'こんにちは',
      });

      expect(result.id).toBe(1);
      expect(result.content).toBe('こんにちは');
    });
  });

  // ────────────────────────────────────────────────
  // findContacts
  // ────────────────────────────────────────────────
  describe('findContacts', () => {
    it('送信先・受信元のユーザー名を重複なしで返す', async () => {
      // 送信: alice -> bob, alice -> charlie
      // 受信: dave -> alice, bob -> alice
      mockPrismaService.chatMessage.findMany
        .mockResolvedValueOnce([{ to_user: 'bob' }, { to_user: 'charlie' }])
        .mockResolvedValueOnce([
          { from_user: 'dave' },
          { from_user: 'bob' }, // bob は重複
        ]);

      const result = await repository.findContacts('alice');

      // ソート済みで返る
      expect(result).toEqual(['bob', 'charlie', 'dave']);
    });

    it('やり取りがない場合は空配列を返す', async () => {
      mockPrismaService.chatMessage.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await repository.findContacts('alice');

      expect(result).toHaveLength(0);
    });
  });
});
