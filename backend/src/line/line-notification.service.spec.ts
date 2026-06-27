import { Test, TestingModule } from '@nestjs/testing';
import { LineNotificationService } from './line-notification.service';
import { TaskNotificationRepository } from 'src/tasks/repository/task-notification.repository';
import { LoggerService } from 'src/common/service/logger.service';

/** モック用通知データ（担当者情報込み） */
const mockPendingNotification = {
  id: 1,
  task_id: 10,
  notify_at: new Date('2026-01-01T00:00:00.000Z'),
  is_sent: false,
  task: {
    id: 10,
    title: 'テストタスク',
    due_date: new Date('2026-12-31T23:59:59.000Z'),
    assignees: [
      {
        username: 'user1',
        task_id: 10,
        account: {
          username: 'user1',
          hashed_password: 'hash',
          line_user_id: 'U123456789',
        },
      },
    ],
  },
};

/** LINE未連携の担当者を持つ通知モック */
const mockNotificationNoLineId = {
  ...mockPendingNotification,
  id: 2,
  task: {
    ...mockPendingNotification.task,
    assignees: [
      {
        username: 'user2',
        task_id: 10,
        account: {
          username: 'user2',
          hashed_password: 'hash',
          line_user_id: null,
        },
      },
    ],
  },
};

const mockNotificationRepository = {
  findPendingNotifications: jest.fn(),
  markAsSent: jest.fn(),
};

const mockLoggerService = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

/** axios のモック */
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const axios = require('axios');

describe('LineNotificationService', () => {
  let service: LineNotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LineNotificationService,
        {
          provide: TaskNotificationRepository,
          useValue: mockNotificationRepository,
        },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<LineNotificationService>(LineNotificationService);
    jest.clearAllMocks();
    process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN = 'test_token';
  });

  afterEach(() => {
    delete process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;
  });

  describe('sendPendingNotifications', () => {
    it('送信対象がない場合は何もしない', async () => {
      mockNotificationRepository.findPendingNotifications.mockResolvedValue([]);

      await service.sendPendingNotifications();

      expect(axios.post).not.toHaveBeenCalled();
      expect(mockNotificationRepository.markAsSent).not.toHaveBeenCalled();
    });

    it('LINE連携済み担当者に対してプッシュメッセージを送信し is_sent を更新する', async () => {
      mockNotificationRepository.findPendingNotifications.mockResolvedValue([
        mockPendingNotification,
      ]);
      axios.post.mockResolvedValue({ data: {} });
      mockNotificationRepository.markAsSent.mockResolvedValue(undefined);

      await service.sendPendingNotifications();

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.line.me/v2/bot/message/push',
        expect.objectContaining({
          to: 'U123456789',
          messages: expect.arrayContaining([
            expect.objectContaining({ type: 'text' }),
          ]),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test_token',
          }),
        }),
      );
      expect(mockNotificationRepository.markAsSent).toHaveBeenCalledWith(1);
    });

    it('LINE未連携の担当者はスキップしてプッシュを送信しない', async () => {
      mockNotificationRepository.findPendingNotifications.mockResolvedValue([
        mockNotificationNoLineId,
      ]);
      mockNotificationRepository.markAsSent.mockResolvedValue(undefined);

      await service.sendPendingNotifications();

      expect(axios.post).not.toHaveBeenCalled();
      /** 担当者が全員未連携でも markAsSent は呼ばれる（通知自体は処理済み扱い） */
      expect(mockNotificationRepository.markAsSent).toHaveBeenCalledWith(2);
    });

    it('アクセストークンが未設定の場合は早期リターンする', async () => {
      delete process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;

      await service.sendPendingNotifications();

      expect(mockNotificationRepository.findPendingNotifications).not.toHaveBeenCalled();
    });

    it('LINE API 送信失敗時も markAsSent は呼ばれ、次回再送できる状態にする', async () => {
      mockNotificationRepository.findPendingNotifications.mockResolvedValue([
        mockPendingNotification,
      ]);
      axios.post.mockRejectedValue(new Error('LINE API error'));
      mockNotificationRepository.markAsSent.mockResolvedValue(undefined);

      await service.sendPendingNotifications();

      /** 送信失敗時でも markAsSent が呼ばれることを確認（全担当者への送信試行完了後） */
      expect(mockNotificationRepository.markAsSent).toHaveBeenCalledWith(1);
    });

    it('メッセージにタスク名と期限が含まれる', async () => {
      mockNotificationRepository.findPendingNotifications.mockResolvedValue([
        mockPendingNotification,
      ]);
      axios.post.mockResolvedValue({ data: {} });
      mockNotificationRepository.markAsSent.mockResolvedValue(undefined);

      await service.sendPendingNotifications();

      const callArgs = axios.post.mock.calls[0][1] as {
        messages: { text: string }[];
      };
      expect(callArgs.messages[0].text).toContain('テストタスク');
      expect(callArgs.messages[0].text).toContain('タスク期限のお知らせ');
    });
  });
});
