import { Test, TestingModule } from '@nestjs/testing';
import { TaskRepository } from './task.repository';
import { PrismaService } from 'src/prisma/prisma.service';

/** モック用タスクデータ */
const mockTaskWithRelations = {
  id: 1,
  title: 'テストタスク',
  description: 'テスト説明',
  due_date: new Date('2026-12-31T23:59:59.000Z'),
  priority: 'MEDIUM',
  category: null,
  parent_id: null,
  created_by: 'testuser',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
  is_completed: false,
  assignees: [{ task_id: 1, username: 'testuser' }],
  children: [],
};

/** PrismaService のモック */
const mockPrismaService = {
  task: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  taskAssignee: {
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('TaskRepository', () => {
  let repository: TaskRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get<TaskRepository>(TaskRepository);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('prisma.task.findMany が where: { parent_id: null } を含む引数で呼ばれる', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([
        mockTaskWithRelations,
      ]);

      await repository.findAll();

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { parent_id: null },
        }),
      );
    });

    it('prisma.task.findMany が orderBy: { due_date: "asc" } を含む引数で呼ばれる', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([
        mockTaskWithRelations,
      ]);

      await repository.findAll();

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { due_date: 'asc' },
        }),
      );
    });

    it('タスク一覧を返す', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([
        mockTaskWithRelations,
      ]);

      const result = await repository.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('タスクが存在しない場合は空配列を返す', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toHaveLength(0);
    });
  });

  describe('findById', () => {
    it('指定IDのタスクを返す', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(
        mockTaskWithRelations,
      );

      const result = await repository.findById(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
    });

    it('存在しないIDの場合は null を返す', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    beforeEach(() => {
      /** $transaction の実装: コールバックを実行してその結果を返す */
      mockPrismaService.$transaction.mockImplementation(
        async (
          callback: (tx: typeof mockPrismaService) => Promise<unknown>,
        ) => {
          return callback(mockPrismaService);
        },
      );
    });

    it('is_completed が指定された場合、prisma.task.update の data に is_completed が含まれる', async () => {
      const updatedTask = { ...mockTaskWithRelations, is_completed: true };
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      await repository.update(1, { is_completed: true });

      expect(mockPrismaService.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ is_completed: true }),
        }),
      );
    });

    it('is_completed: false が指定された場合、prisma.task.update の data に is_completed: false が含まれる', async () => {
      const updatedTask = { ...mockTaskWithRelations, is_completed: false };
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      await repository.update(1, { is_completed: false });

      expect(mockPrismaService.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ is_completed: false }),
        }),
      );
    });

    it('is_completed が指定されない場合、prisma.task.update の data に is_completed が含まれない', async () => {
      const updatedTask = { ...mockTaskWithRelations, title: '更新後タイトル' };
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      await repository.update(1, { title: '更新後タイトル' });

      const callArgs = mockPrismaService.task.update.mock.calls[0][0] as {
        data: Record<string, unknown>;
      };
      expect(callArgs.data).not.toHaveProperty('is_completed');
    });

    it('タイトル更新時は prisma.task.update の data に title が含まれる', async () => {
      const updatedTask = { ...mockTaskWithRelations, title: '新しいタイトル' };
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      await repository.update(1, { title: '新しいタイトル' });

      expect(mockPrismaService.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: '新しいタイトル' }),
        }),
      );
    });

    it('assignees が指定された場合、既存の担当者を削除してから再登録する', async () => {
      mockPrismaService.taskAssignee.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.task.update.mockResolvedValue(mockTaskWithRelations);

      await repository.update(1, { assignees: ['newuser'] });

      expect(mockPrismaService.taskAssignee.deleteMany).toHaveBeenCalledWith({
        where: { task_id: 1 },
      });
    });

    it('assignees が指定されない場合、担当者の削除は実行されない', async () => {
      mockPrismaService.task.update.mockResolvedValue(mockTaskWithRelations);

      await repository.update(1, { title: 'タイトルのみ更新' });

      expect(mockPrismaService.taskAssignee.deleteMany).not.toHaveBeenCalled();
    });
  });
});
