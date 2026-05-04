import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EventService } from './event.service';
import { EventRepository } from '../repository/event.repository';
import { LoggerService } from 'src/common/service/logger.service';
import { MESSAGE } from 'src/common/type/message';

/** モック用予定データ */
const mockEvent = {
  id: 1,
  title: 'テスト予定',
  description: 'テスト説明',
  start_at: new Date('2026-06-01T10:00:00.000Z'),
  end_at: new Date('2026-06-01T11:00:00.000Z'),
  created_by: 'testuser',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
};

const mockEventRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockLoggerService = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('EventService', () => {
  let service: EventService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        { provide: EventRepository, useValue: mockEventRepository },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
    jest.clearAllMocks();
  });

  // ────────────────────────────────────────────────
  // findAll
  // ────────────────────────────────────────────────
  describe('findAll', () => {
    it('予定一覧を EventResponseDto の配列で返す', async () => {
      mockEventRepository.findAll.mockResolvedValue([mockEvent]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].title).toBe('テスト予定');
    });

    it('予定が存在しない場合は空配列を返す', async () => {
      mockEventRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toHaveLength(0);
    });

    it('start_at / end_at が ISO 文字列に変換される', async () => {
      mockEventRepository.findAll.mockResolvedValue([mockEvent]);

      const result = await service.findAll();

      expect(typeof result[0].start_at).toBe('string');
      expect(typeof result[0].end_at).toBe('string');
      expect(result[0].start_at).toBe(mockEvent.start_at.toISOString());
      expect(result[0].end_at).toBe(mockEvent.end_at.toISOString());
    });
  });

  // ────────────────────────────────────────────────
  // findById
  // ────────────────────────────────────────────────
  describe('findById', () => {
    it('指定 ID の予定を EventResponseDto で返す', async () => {
      mockEventRepository.findById.mockResolvedValue(mockEvent);

      const result = await service.findById(1);

      expect(result.id).toBe(1);
      expect(result.title).toBe('テスト予定');
    });

    it('存在しない ID の場合は NotFoundException をスローする', async () => {
      mockEventRepository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findById(999)).rejects.toThrow(
        MESSAGE.EVENT.NOT_FOUND,
      );
    });

    it('created_at / updated_at が ISO 文字列に変換される', async () => {
      mockEventRepository.findById.mockResolvedValue(mockEvent);

      const result = await service.findById(1);

      expect(typeof result.created_at).toBe('string');
      expect(typeof result.updated_at).toBe('string');
    });
  });

  // ────────────────────────────────────────────────
  // create
  // ────────────────────────────────────────────────
  describe('create', () => {
    it('予定を作成して EventResponseDto を返す', async () => {
      mockEventRepository.create.mockResolvedValue(mockEvent);

      const dto = {
        title: 'テスト予定',
        description: 'テスト説明',
        start_at: '2026-06-01T10:00:00.000Z',
        end_at: '2026-06-01T11:00:00.000Z',
      };

      const result = await service.create(dto, 'testuser');

      expect(result.title).toBe('テスト予定');
      expect(result.created_by).toBe('testuser');
    });

    it('repository.create が Date オブジェクトを受け取る', async () => {
      mockEventRepository.create.mockResolvedValue(mockEvent);

      const dto = {
        title: 'テスト予定',
        start_at: '2026-06-01T10:00:00.000Z',
        end_at: '2026-06-01T11:00:00.000Z',
      };

      await service.create(dto, 'testuser');

      expect(mockEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          start_at: new Date('2026-06-01T10:00:00.000Z'),
          end_at: new Date('2026-06-01T11:00:00.000Z'),
        }),
      );
    });

    it('description が未指定の場合、空文字列が渡される', async () => {
      mockEventRepository.create.mockResolvedValue(mockEvent);

      const dto = {
        title: 'テスト予定',
        start_at: '2026-06-01T10:00:00.000Z',
        end_at: '2026-06-01T11:00:00.000Z',
      };

      await service.create(dto, 'testuser');

      expect(mockEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: '' }),
      );
    });

    it('DB エラー時は InternalServerErrorException をスローする', async () => {
      mockEventRepository.create.mockRejectedValue(new Error('DB error'));

      const dto = {
        title: 'テスト予定',
        start_at: '2026-06-01T10:00:00.000Z',
        end_at: '2026-06-01T11:00:00.000Z',
      };

      await expect(service.create(dto, 'testuser')).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.create(dto, 'testuser')).rejects.toThrow(
        MESSAGE.EVENT.CREATE_FAILED,
      );
    });
  });

  // ────────────────────────────────────────────────
  // update
  // ────────────────────────────────────────────────
  describe('update', () => {
    it('作成者が更新すると更新済み EventResponseDto を返す', async () => {
      mockEventRepository.findById.mockResolvedValue(mockEvent);
      const updatedEvent = { ...mockEvent, title: '更新後予定' };
      mockEventRepository.update.mockResolvedValue(updatedEvent);

      const result = await service.update(
        1,
        { title: '更新後予定' },
        'testuser',
      );

      expect(result.title).toBe('更新後予定');
    });

    it('存在しない ID の場合は NotFoundException をスローする', async () => {
      mockEventRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(999, { title: '更新' }, 'testuser'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update(999, { title: '更新' }, 'testuser'),
      ).rejects.toThrow(MESSAGE.EVENT.NOT_FOUND);
    });

    it('作成者以外が更新しようとすると ForbiddenException をスローする', async () => {
      mockEventRepository.findById.mockResolvedValue(mockEvent);

      await expect(
        service.update(1, { title: '更新' }, 'otheruser'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(1, { title: '更新' }, 'otheruser'),
      ).rejects.toThrow(MESSAGE.EVENT.FORBIDDEN);
    });

    it('start_at が指定された場合 Date オブジェクトに変換して repository に渡す', async () => {
      mockEventRepository.findById.mockResolvedValue(mockEvent);
      mockEventRepository.update.mockResolvedValue(mockEvent);

      await service.update(
        1,
        { start_at: '2026-07-01T09:00:00.000Z' },
        'testuser',
      );

      expect(mockEventRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          start_at: new Date('2026-07-01T09:00:00.000Z'),
        }),
      );
    });

    it('end_at が指定された場合 Date オブジェクトに変換して repository に渡す', async () => {
      mockEventRepository.findById.mockResolvedValue(mockEvent);
      mockEventRepository.update.mockResolvedValue(mockEvent);

      await service.update(
        1,
        { end_at: '2026-07-01T10:00:00.000Z' },
        'testuser',
      );

      expect(mockEventRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          end_at: new Date('2026-07-01T10:00:00.000Z'),
        }),
      );
    });

    it('start_at / end_at が未指定の場合 undefined として repository に渡す', async () => {
      mockEventRepository.findById.mockResolvedValue(mockEvent);
      mockEventRepository.update.mockResolvedValue(mockEvent);

      await service.update(1, { title: 'タイトルのみ変更' }, 'testuser');

      expect(mockEventRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          start_at: undefined,
          end_at: undefined,
        }),
      );
    });

    it('DB エラー時は InternalServerErrorException をスローする', async () => {
      mockEventRepository.findById.mockResolvedValue(mockEvent);
      mockEventRepository.update.mockRejectedValue(new Error('DB error'));

      await expect(
        service.update(1, { title: '更新' }, 'testuser'),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.update(1, { title: '更新' }, 'testuser'),
      ).rejects.toThrow(MESSAGE.EVENT.UPDATE_FAILED);
    });
  });

  // ────────────────────────────────────────────────
  // remove
  // ────────────────────────────────────────────────
  describe('remove', () => {
    it('作成者が削除すると正常に完了する', async () => {
      mockEventRepository.findById.mockResolvedValue(mockEvent);
      mockEventRepository.delete.mockResolvedValue(undefined);

      await expect(service.remove(1, 'testuser')).resolves.toBeUndefined();
      expect(mockEventRepository.delete).toHaveBeenCalledWith(1);
    });

    it('存在しない ID の場合は NotFoundException をスローする', async () => {
      mockEventRepository.findById.mockResolvedValue(null);

      await expect(service.remove(999, 'testuser')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.remove(999, 'testuser')).rejects.toThrow(
        MESSAGE.EVENT.NOT_FOUND,
      );
    });

    it('作成者以外が削除しようとすると ForbiddenException をスローする', async () => {
      mockEventRepository.findById.mockResolvedValue(mockEvent);

      await expect(service.remove(1, 'otheruser')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.remove(1, 'otheruser')).rejects.toThrow(
        MESSAGE.EVENT.FORBIDDEN,
      );
    });

    it('DB エラー時は InternalServerErrorException をスローする', async () => {
      mockEventRepository.findById.mockResolvedValue(mockEvent);
      mockEventRepository.delete.mockRejectedValue(new Error('DB error'));

      await expect(service.remove(1, 'testuser')).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.remove(1, 'testuser')).rejects.toThrow(
        MESSAGE.EVENT.DELETE_FAILED,
      );
    });
  });
});
