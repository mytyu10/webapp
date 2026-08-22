import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatRepository } from '../repository/chat.repository';
import { AccountRepository } from 'src/accounts/repository/account.repository';
import { LoggerService } from 'src/common/service/logger.service';
import { MESSAGE } from 'src/common/type/message';

/** モック用メッセージデータ */
const mockMessage = {
  id: 1,
  from_user: 'alice',
  to_user: 'bob',
  content: 'こんにちは',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
};

const mockChatRepository = {
  findConversation: jest.fn(),
  create: jest.fn(),
  findContacts: jest.fn(),
};

const mockAccountRepository = {
  findAll: jest.fn(),
};

const mockLoggerService = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: ChatRepository, useValue: mockChatRepository },
        { provide: AccountRepository, useValue: mockAccountRepository },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    jest.clearAllMocks();
  });

  // ────────────────────────────────────────────────
  // findConversation
  // ────────────────────────────────────────────────
  describe('findConversation', () => {
    it('メッセージ一覧を ChatMessageResponseDto の配列で返す', async () => {
      mockChatRepository.findConversation.mockResolvedValue([mockMessage]);

      const result = await service.findConversation('alice', 'bob');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].from_user).toBe('alice');
      expect(result[0].to_user).toBe('bob');
      expect(result[0].content).toBe('こんにちは');
      expect(result[0].created_at).toBe(
        new Date('2026-01-01T00:00:00.000Z').toISOString(),
      );
    });

    it('メッセージが存在しない場合は空配列を返す', async () => {
      mockChatRepository.findConversation.mockResolvedValue([]);

      const result = await service.findConversation('alice', 'bob');

      expect(result).toHaveLength(0);
    });

    it('リポジトリがエラーをスローした場合は InternalServerErrorException をスローする', async () => {
      mockChatRepository.findConversation.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(service.findConversation('alice', 'bob')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ────────────────────────────────────────────────
  // sendMessage
  // ────────────────────────────────────────────────
  describe('sendMessage', () => {
    it('メッセージを作成して ChatMessageResponseDto で返す', async () => {
      mockChatRepository.create.mockResolvedValue(mockMessage);

      const dto = { to_user: 'bob', content: 'こんにちは' };
      const result = await service.sendMessage('alice', dto);

      expect(mockChatRepository.create).toHaveBeenCalledWith({
        from_user: 'alice',
        to_user: 'bob',
        content: 'こんにちは',
      });
      expect(result.id).toBe(1);
      expect(result.content).toBe('こんにちは');
    });

    it('リポジトリがエラーをスローした場合は InternalServerErrorException をスローする', async () => {
      mockChatRepository.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.sendMessage('alice', { to_user: 'bob', content: 'hello' }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('エラーメッセージに CHAT.SEND_FAILED が含まれる', async () => {
      mockChatRepository.create.mockRejectedValue(new Error('DB error'));

      try {
        await service.sendMessage('alice', {
          to_user: 'bob',
          content: 'hello',
        });
      } catch (err) {
        expect((err as InternalServerErrorException).message).toBe(
          MESSAGE.CHAT.SEND_FAILED,
        );
      }
    });
  });

  // ────────────────────────────────────────────────
  // findContacts
  // ────────────────────────────────────────────────
  describe('findContacts', () => {
    it('チャット相手一覧を ChatContactResponseDto の配列で返す', async () => {
      mockChatRepository.findContacts.mockResolvedValue(['bob', 'charlie']);

      const result = await service.findContacts('alice');

      expect(result).toEqual([{ username: 'bob' }, { username: 'charlie' }]);
    });

    it('リポジトリがエラーをスローした場合は InternalServerErrorException をスローする', async () => {
      mockChatRepository.findContacts.mockRejectedValue(new Error('DB error'));

      await expect(service.findContacts('alice')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ────────────────────────────────────────────────
  // findAllUsers
  // ────────────────────────────────────────────────
  describe('findAllUsers', () => {
    it('currentUser を除いた全ユーザー一覧を返す', async () => {
      mockAccountRepository.findAll.mockResolvedValue([
        { username: 'alice', display_name: null },
        { username: 'bob', display_name: 'Bob' },
        { username: 'charlie', display_name: null },
      ]);

      const result = await service.findAllUsers('alice');

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.username)).toEqual(['bob', 'charlie']);
    });

    it('他ユーザーが存在しない場合は空配列を返す', async () => {
      mockAccountRepository.findAll.mockResolvedValue([
        { username: 'alice', display_name: null },
      ]);

      const result = await service.findAllUsers('alice');

      expect(result).toHaveLength(0);
    });

    it('AccountRepository がエラーをスローした場合は InternalServerErrorException をスローする', async () => {
      mockAccountRepository.findAll.mockRejectedValue(new Error('DB error'));

      await expect(service.findAllUsers('alice')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
