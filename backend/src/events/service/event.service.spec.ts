import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { EventService } from './event.service';
import { EventRepository } from '../repository/event.repository';
import { LoggerService } from 'src/common/service/logger.service';
import { MESSAGE } from 'src/common/type/message';
import { RepeatType } from '../dto/event.dto';

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
  createMany: jest.fn(),
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
  // createMultiple
  // ────────────────────────────────────────────────
  describe('createMultiple', () => {
    const makeMultipleEvent = (id: number, startOffset: number) => ({
      ...mockEvent,
      id,
      start_at: new Date(
        new Date('2026-06-01T10:00:00.000Z').getTime() + startOffset,
      ),
      end_at: new Date(
        new Date('2026-06-01T10:00:00.000Z').getTime() +
          startOffset +
          60 * 60 * 1000,
      ),
    });

    it('start_times 配列の件数分の予定を一括作成して EventResponseDto[] を返す', async () => {
      const events = [makeMultipleEvent(1, 0), makeMultipleEvent(2, 86400000)];
      mockEventRepository.createMany.mockResolvedValue(events);

      const dto = {
        title: '複数予定',
        duration_minutes: 60,
        start_times: ['2026-06-01T10:00:00.000Z', '2026-06-02T10:00:00.000Z'],
      };

      const result = await service.createMultiple(dto, 'testuser');

      expect(result).toHaveLength(2);
      expect(mockEventRepository.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ created_by: 'testuser' }),
          expect.objectContaining({ created_by: 'testuser' }),
        ]),
      );
    });

    it('end_at = start_at + duration_minutes で算出される', async () => {
      mockEventRepository.createMany.mockResolvedValue([
        makeMultipleEvent(1, 0),
      ]);

      const dto = {
        title: '複数予定',
        duration_minutes: 90,
        start_times: ['2026-06-01T10:00:00.000Z'],
      };

      await service.createMultiple(dto, 'testuser');

      expect(mockEventRepository.createMany).toHaveBeenCalledWith([
        expect.objectContaining({
          start_at: new Date('2026-06-01T10:00:00.000Z'),
          end_at: new Date('2026-06-01T11:30:00.000Z'),
        }),
      ]);
    });

    it('start_times が空配列の場合 BadRequestException をスローする', async () => {
      const dto = {
        title: '複数予定',
        duration_minutes: 60,
        start_times: [],
      };

      await expect(service.createMultiple(dto, 'testuser')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('start_times が100件超の場合 BadRequestException をスローする', async () => {
      const dto = {
        title: '複数予定',
        duration_minutes: 60,
        start_times: Array.from(
          { length: 101 },
          (_, i) => `2026-06-${String(i + 1).padStart(2, '0')}T10:00:00.000Z`,
        ),
      };

      await expect(service.createMultiple(dto, 'testuser')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createMultiple(dto, 'testuser')).rejects.toThrow(
        MESSAGE.EVENT.REPEAT_LIMIT_EXCEEDED,
      );
    });

    it('DB エラー時は InternalServerErrorException をスローする', async () => {
      mockEventRepository.createMany.mockRejectedValue(new Error('DB error'));

      const dto = {
        title: '複数予定',
        duration_minutes: 60,
        start_times: ['2026-06-01T10:00:00.000Z'],
      };

      await expect(service.createMultiple(dto, 'testuser')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ────────────────────────────────────────────────
  // createRepeat
  // ────────────────────────────────────────────────
  describe('createRepeat', () => {
    const makeMockEvents = (count: number) =>
      Array.from({ length: count }, (_, i) => ({ ...mockEvent, id: i + 1 }));

    describe('毎日繰り返し (daily)', () => {
      it('count=3, interval=1 の場合3件の予定が作成される', async () => {
        mockEventRepository.createMany.mockResolvedValue(makeMockEvents(3));

        const dto = {
          title: '毎日予定',
          duration_minutes: 60,
          start_at: '2026-06-01T10:00:00.000Z',
          repeat: {
            type: RepeatType.DAILY,
            interval: 1,
            count: 3,
          },
        };

        const result = await service.createRepeat(dto, 'testuser');

        expect(result).toHaveLength(3);
        expect(mockEventRepository.createMany).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              start_at: new Date('2026-06-01T10:00:00.000Z'),
            }),
            expect.objectContaining({
              start_at: new Date('2026-06-02T10:00:00.000Z'),
            }),
            expect.objectContaining({
              start_at: new Date('2026-06-03T10:00:00.000Z'),
            }),
          ]),
        );
      });

      it('interval=2 の場合2日おきに繰り返す', async () => {
        mockEventRepository.createMany.mockResolvedValue(makeMockEvents(2));

        const dto = {
          title: '2日おき予定',
          duration_minutes: 30,
          start_at: '2026-06-01T10:00:00.000Z',
          repeat: {
            type: RepeatType.DAILY,
            interval: 2,
            count: 2,
          },
        };

        await service.createRepeat(dto, 'testuser');

        expect(mockEventRepository.createMany).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              start_at: new Date('2026-06-01T10:00:00.000Z'),
            }),
            expect.objectContaining({
              start_at: new Date('2026-06-03T10:00:00.000Z'),
            }),
          ]),
        );
      });

      it('end_date が指定された場合はその日付までの予定が生成される', async () => {
        mockEventRepository.createMany.mockImplementation((data: unknown[]) =>
          Promise.resolve(makeMockEvents(data.length)),
        );

        const dto = {
          title: '毎日予定（終了日あり）',
          duration_minutes: 60,
          start_at: '2026-06-01T10:00:00.000Z',
          repeat: {
            type: RepeatType.DAILY,
            interval: 1,
            end_date: '2026-06-03T23:59:59.000Z',
          },
        };

        const result = await service.createRepeat(dto, 'testuser');

        // 6/1, 6/2, 6/3 の3件
        expect(result).toHaveLength(3);
      });
    });

    describe('毎週繰り返し (weekly)', () => {
      it('days_of_week 未指定の場合 start_at の曜日で毎週繰り返す', async () => {
        mockEventRepository.createMany.mockResolvedValue(makeMockEvents(3));

        // 2026-06-01 は月曜日
        const dto = {
          title: '毎週月曜',
          duration_minutes: 60,
          start_at: '2026-06-01T10:00:00.000Z',
          repeat: {
            type: RepeatType.WEEKLY,
            interval: 1,
            count: 3,
          },
        };

        await service.createRepeat(dto, 'testuser');

        expect(mockEventRepository.createMany).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              start_at: new Date('2026-06-01T10:00:00.000Z'),
            }),
            expect.objectContaining({
              start_at: new Date('2026-06-08T10:00:00.000Z'),
            }),
            expect.objectContaining({
              start_at: new Date('2026-06-15T10:00:00.000Z'),
            }),
          ]),
        );
      });

      it('days_of_week=[1,3] の場合 月・水 に繰り返す', async () => {
        mockEventRepository.createMany.mockImplementation((data: unknown[]) =>
          Promise.resolve(makeMockEvents(data.length)),
        );

        // 2026-06-01 は月曜日
        const dto = {
          title: '月水予定',
          duration_minutes: 60,
          start_at: '2026-06-01T10:00:00.000Z',
          repeat: {
            type: RepeatType.WEEKLY,
            interval: 1,
            days_of_week: [1, 3],
            count: 4,
          },
        };

        const result = await service.createRepeat(dto, 'testuser');

        // 6/1(月), 6/3(水), 6/8(月), 6/10(水) の4件
        expect(result).toHaveLength(4);
      });
    });

    describe('毎月繰り返し (monthly)', () => {
      it('count=3, interval=1 の場合 毎月同日に3件の予定が作成される', async () => {
        mockEventRepository.createMany.mockResolvedValue(makeMockEvents(3));

        const dto = {
          title: '毎月1日',
          duration_minutes: 60,
          start_at: '2026-06-01T10:00:00.000Z',
          repeat: {
            type: RepeatType.MONTHLY,
            interval: 1,
            count: 3,
          },
        };

        await service.createRepeat(dto, 'testuser');

        expect(mockEventRepository.createMany).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              start_at: new Date('2026-06-01T10:00:00.000Z'),
            }),
            expect.objectContaining({
              start_at: new Date('2026-07-01T10:00:00.000Z'),
            }),
            expect.objectContaining({
              start_at: new Date('2026-08-01T10:00:00.000Z'),
            }),
          ]),
        );
      });

      it('月末補正: 31日指定で2月は28日（非閏年）になる', async () => {
        mockEventRepository.createMany.mockImplementation((data: unknown[]) =>
          Promise.resolve(makeMockEvents(data.length)),
        );

        const dto = {
          title: '毎月31日',
          duration_minutes: 60,
          start_at: '2026-01-31T10:00:00.000Z',
          repeat: {
            type: RepeatType.MONTHLY,
            interval: 1,
            count: 2,
          },
        };

        await service.createRepeat(dto, 'testuser');

        // 1/31, 2/28（2026年は非閏年）
        expect(mockEventRepository.createMany).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              start_at: new Date('2026-01-31T10:00:00.000Z'),
            }),
            expect.objectContaining({
              start_at: new Date('2026-02-28T10:00:00.000Z'),
            }),
          ]),
        );
      });
    });

    describe('バリデーション', () => {
      it('展開結果が0件の場合 BadRequestException をスローする', async () => {
        const dto = {
          title: '繰り返し予定',
          duration_minutes: 60,
          start_at: '2026-06-10T10:00:00.000Z',
          repeat: {
            type: RepeatType.DAILY,
            interval: 1,
            // end_date が start_at より前
            end_date: '2026-06-09T00:00:00.000Z',
          },
        };

        await expect(service.createRepeat(dto, 'testuser')).rejects.toThrow(
          BadRequestException,
        );
      });

      it('展開結果が100件超の場合 BadRequestException をスローする', async () => {
        const dto = {
          title: '繰り返し予定',
          duration_minutes: 60,
          start_at: '2026-01-01T10:00:00.000Z',
          repeat: {
            type: RepeatType.DAILY,
            interval: 1,
            count: 101,
          },
        };

        await expect(service.createRepeat(dto, 'testuser')).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.createRepeat(dto, 'testuser')).rejects.toThrow(
          MESSAGE.EVENT.REPEAT_LIMIT_EXCEEDED,
        );
      });
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
