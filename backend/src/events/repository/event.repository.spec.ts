import { Test, TestingModule } from '@nestjs/testing';
import { EventRepository } from './event.repository';
import { PrismaService } from 'src/prisma/prisma.service';

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

/** PrismaService のモック */
const mockPrismaService = {
  event: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('EventRepository', () => {
  let repository: EventRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get<EventRepository>(EventRepository);
    jest.clearAllMocks();
  });

  // ────────────────────────────────────────────────
  // findAll
  // ────────────────────────────────────────────────
  describe('findAll', () => {
    it('prisma.event.findMany が orderBy: { start_at: "asc" } で呼ばれる', async () => {
      mockPrismaService.event.findMany.mockResolvedValue([mockEvent]);

      await repository.findAll();

      expect(mockPrismaService.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { start_at: 'asc' },
        }),
      );
    });

    it('予定一覧を返す', async () => {
      mockPrismaService.event.findMany.mockResolvedValue([mockEvent]);

      const result = await repository.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].title).toBe('テスト予定');
    });

    it('予定が存在しない場合は空配列を返す', async () => {
      mockPrismaService.event.findMany.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toHaveLength(0);
    });
  });

  // ────────────────────────────────────────────────
  // findById
  // ────────────────────────────────────────────────
  describe('findById', () => {
    it('指定 ID の予定を返す', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(mockEvent);

      const result = await repository.findById(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(result?.title).toBe('テスト予定');
    });

    it('存在しない ID の場合は null を返す', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });

    it('prisma.event.findUnique が where: { id } で呼ばれる', async () => {
      mockPrismaService.event.findUnique.mockResolvedValue(mockEvent);

      await repository.findById(1);

      expect(mockPrismaService.event.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });

  // ────────────────────────────────────────────────
  // create
  // ────────────────────────────────────────────────
  describe('create', () => {
    it('予定を作成して返す', async () => {
      mockPrismaService.event.create.mockResolvedValue(mockEvent);

      const data = {
        title: 'テスト予定',
        description: 'テスト説明',
        start_at: new Date('2026-06-01T10:00:00.000Z'),
        end_at: new Date('2026-06-01T11:00:00.000Z'),
        created_by: 'testuser',
      };

      const result = await repository.create(data);

      expect(result.id).toBe(1);
      expect(result.title).toBe('テスト予定');
    });

    it('prisma.event.create が正しいデータで呼ばれる', async () => {
      mockPrismaService.event.create.mockResolvedValue(mockEvent);

      const data = {
        title: 'テスト予定',
        description: 'テスト説明',
        start_at: new Date('2026-06-01T10:00:00.000Z'),
        end_at: new Date('2026-06-01T11:00:00.000Z'),
        created_by: 'testuser',
      };

      await repository.create(data);

      expect(mockPrismaService.event.create).toHaveBeenCalledWith({
        data: {
          title: data.title,
          description: data.description,
          start_at: data.start_at,
          end_at: data.end_at,
          created_by: data.created_by,
        },
      });
    });
  });

  // ────────────────────────────────────────────────
  // update
  // ────────────────────────────────────────────────
  describe('update', () => {
    it('title が指定された場合、prisma.event.update の data に title が含まれる', async () => {
      const updatedEvent = { ...mockEvent, title: '更新後タイトル' };
      mockPrismaService.event.update.mockResolvedValue(updatedEvent);

      await repository.update(1, { title: '更新後タイトル' });

      expect(mockPrismaService.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({ title: '更新後タイトル' }),
        }),
      );
    });

    it('description が指定された場合、prisma.event.update の data に description が含まれる', async () => {
      const updatedEvent = { ...mockEvent, description: '新しい説明' };
      mockPrismaService.event.update.mockResolvedValue(updatedEvent);

      await repository.update(1, { description: '新しい説明' });

      expect(mockPrismaService.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({ description: '新しい説明' }),
        }),
      );
    });

    it('start_at が指定された場合、prisma.event.update の data に start_at が含まれる', async () => {
      const newStartAt = new Date('2026-07-01T09:00:00.000Z');
      const updatedEvent = { ...mockEvent, start_at: newStartAt };
      mockPrismaService.event.update.mockResolvedValue(updatedEvent);

      await repository.update(1, { start_at: newStartAt });

      expect(mockPrismaService.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({ start_at: newStartAt }),
        }),
      );
    });

    it('end_at が指定された場合、prisma.event.update の data に end_at が含まれる', async () => {
      const newEndAt = new Date('2026-07-01T10:00:00.000Z');
      const updatedEvent = { ...mockEvent, end_at: newEndAt };
      mockPrismaService.event.update.mockResolvedValue(updatedEvent);

      await repository.update(1, { end_at: newEndAt });

      expect(mockPrismaService.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({ end_at: newEndAt }),
        }),
      );
    });

    it('undefined のフィールドは prisma.event.update の data に含まれない', async () => {
      mockPrismaService.event.update.mockResolvedValue(mockEvent);

      await repository.update(1, { title: '新タイトル' });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const callArgs = mockPrismaService.event.update.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(callArgs.data).not.toHaveProperty('description');
      expect(callArgs.data).not.toHaveProperty('start_at');
      expect(callArgs.data).not.toHaveProperty('end_at');
    });

    it('prisma.event.update が where: { id } で呼ばれる', async () => {
      mockPrismaService.event.update.mockResolvedValue(mockEvent);

      await repository.update(1, { title: '新タイトル' });

      expect(mockPrismaService.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
        }),
      );
    });

    it('更新後の予定を返す', async () => {
      const updatedEvent = { ...mockEvent, title: '更新後タイトル' };
      mockPrismaService.event.update.mockResolvedValue(updatedEvent);

      const result = await repository.update(1, { title: '更新後タイトル' });

      expect(result.title).toBe('更新後タイトル');
    });
  });

  // ────────────────────────────────────────────────
  // delete
  // ────────────────────────────────────────────────
  describe('delete', () => {
    it('prisma.event.delete が where: { id } で呼ばれる', async () => {
      mockPrismaService.event.delete.mockResolvedValue(mockEvent);

      await repository.delete(1);

      expect(mockPrismaService.event.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('正常に完了する（戻り値なし）', async () => {
      mockPrismaService.event.delete.mockResolvedValue(mockEvent);

      await expect(repository.delete(1)).resolves.toBeUndefined();
    });
  });
});
