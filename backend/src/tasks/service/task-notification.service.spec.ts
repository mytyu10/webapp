import { Test, TestingModule } from '@nestjs/testing';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { TaskNotificationService } from './task-notification.service';
import { TaskNotificationRepository } from '../repository/task-notification.repository';
import { LoggerService } from 'src/common/service/logger.service';
import { MESSAGE } from 'src/common/type/message';

/** モック用通知データ */
const mockNotification = {
  id: 1,
  task_id: 10,
  notify_at: new Date('2026-12-01T09:00:00.000Z'),
  is_sent: false,
};

const mockNotificationRepository = {
  create: jest.fn(),
  findByTaskId: jest.fn(),
  delete: jest.fn(),
  findPendingNotifications: jest.fn(),
  markAsSent: jest.fn(),
};

const mockLoggerService = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('TaskNotificationService', () => {
  let service: TaskNotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskNotificationService,
        {
          provide: TaskNotificationRepository,
          useValue: mockNotificationRepository,
        },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<TaskNotificationService>(TaskNotificationService);
    jest.clearAllMocks();
  });

  describe('addNotification', () => {
    it('通知を追加して NotificationResponseDto を返す', async () => {
      mockNotificationRepository.create.mockResolvedValue(mockNotification);

      const result = await service.addNotification(10, '2026-12-01T09:00:00.000Z');

      expect(result.id).toBe(1);
      expect(result.task_id).toBe(10);
      expect(result.notify_at).toBe('2026-12-01T09:00:00.000Z');
      expect(result.is_sent).toBe(false);
      expect(mockNotificationRepository.create).toHaveBeenCalledWith(
        10,
        new Date('2026-12-01T09:00:00.000Z'),
      );
    });

    it('DBエラー時は InternalServerErrorException をスローする', async () => {
      mockNotificationRepository.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.addNotification(10, '2026-12-01T09:00:00.000Z'),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.addNotification(10, '2026-12-01T09:00:00.000Z'),
      ).rejects.toThrow(MESSAGE.NOTIFICATION.CREATE_FAILED);
    });
  });

  describe('getNotifications', () => {
    it('タスクの通知一覧を返す', async () => {
      mockNotificationRepository.findByTaskId.mockResolvedValue([
        mockNotification,
      ]);

      const result = await service.getNotifications(10);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].task_id).toBe(10);
      expect(result[0].notify_at).toBe('2026-12-01T09:00:00.000Z');
      expect(mockNotificationRepository.findByTaskId).toHaveBeenCalledWith(10);
    });

    it('通知が存在しない場合は空配列を返す', async () => {
      mockNotificationRepository.findByTaskId.mockResolvedValue([]);

      const result = await service.getNotifications(10);

      expect(result).toHaveLength(0);
    });

    it('DBエラー時は InternalServerErrorException をスローする', async () => {
      mockNotificationRepository.findByTaskId.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(service.getNotifications(10)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('removeNotification', () => {
    it('通知を削除する', async () => {
      mockNotificationRepository.delete.mockResolvedValue(undefined);

      await expect(service.removeNotification(1)).resolves.toBeUndefined();
      expect(mockNotificationRepository.delete).toHaveBeenCalledWith(1);
    });

    it('削除失敗時は NotFoundException をスローする', async () => {
      mockNotificationRepository.delete.mockRejectedValue(
        new Error('Not found'),
      );

      await expect(service.removeNotification(999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removeNotification(999)).rejects.toThrow(
        MESSAGE.NOTIFICATION.NOT_FOUND,
      );
    });
  });
});
