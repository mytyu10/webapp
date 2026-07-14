import { Test, TestingModule } from '@nestjs/testing';
import { WsException } from '@nestjs/websockets';
import { ChatGateway } from './chat.gateway';
import { ChatService } from '../service/chat.service';
import { LoggerService } from 'src/common/service/logger.service';
import type { ChatMessageResponseDto } from '../dto/chat.dto';

const mockMessage: ChatMessageResponseDto = {
  id: 1,
  from_user: 'alice',
  to_user: 'bob',
  content: 'こんにちは',
  created_at: '2026-07-14T00:00:00.000Z',
};

/** Socket.io の Socket モック */
function createMockSocket(token?: string): {
  id: string;
  handshake: {
    auth: Record<string, string>;
    query: Record<string, string>;
  };
  data: Record<string, unknown>;
  disconnect: jest.Mock;
  join: jest.Mock;
  emit: jest.Mock;
} {
  return {
    id: 'socket-id-test',
    handshake: {
      auth: token ? { token } : {},
      query: {},
    },
    data: {},
    disconnect: jest.fn(),
    join: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn(),
  };
}

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let chatService: jest.Mocked<ChatService>;

  beforeEach(async () => {
    const mockChatService = {
      sendMessage: jest.fn().mockResolvedValue(mockMessage),
      findConversation: jest.fn(),
      findContacts: jest.fn(),
      findAllUsers: jest.fn(),
    };

    const mockLoggerService = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: ChatService, useValue: mockChatService },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    chatService = module.get(ChatService);

    // server のモック
    (gateway as unknown as { server: { to: jest.Mock } }).server = {
      to: jest.fn().mockReturnValue({ to: jest.fn().mockReturnValue({ emit: jest.fn() }) }),
    };
  });

  describe('handleConnection', () => {
    it('トークンがない場合は切断する', () => {
      const client = createMockSocket();
      gateway.handleConnection(client as never);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('JWTが無効な場合は切断する', () => {
      const client = createMockSocket('invalid-token');
      gateway.handleConnection(client as never);
      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleSendMessage', () => {
    it('ユーザー情報がない場合は WsException をスローする', async () => {
      const client = createMockSocket();
      // data.user が未設定の状態でテスト

      await expect(
        gateway.handleSendMessage(client as never, {
          to_user: 'bob',
          content: 'テスト',
        }),
      ).rejects.toThrow(WsException);
    });

    it('ユーザー情報がある場合はメッセージを保存してemitする', async () => {
      const client = createMockSocket();
      client.data['user'] = { username: 'alice' };

      const mockTo = jest.fn().mockReturnValue({
        to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      });
      (gateway as unknown as { server: { to: jest.Mock } }).server = {
        to: mockTo,
      };

      await gateway.handleSendMessage(client as never, {
        to_user: 'bob',
        content: 'こんにちは',
      });

      expect(chatService.sendMessage).toHaveBeenCalledWith('alice', {
        to_user: 'bob',
        content: 'こんにちは',
      });
      expect(mockTo).toHaveBeenCalledWith('user:alice');
    });
  });

  describe('handleDisconnect', () => {
    it('切断時にログを出力する（エラーなし）', () => {
      const client = createMockSocket();
      client.data['user'] = { username: 'alice' };
      expect(() => gateway.handleDisconnect(client as never)).not.toThrow();
    });
  });
});
