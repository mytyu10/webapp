import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskRepository } from '../repository/task.repository';
import { LoggerService } from 'src/common/service/logger.service';
import { MESSAGE } from 'src/common/type/message';

/** モック用タスクデータ */
const mockTask = {
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
  closed_by: null,
  assignees: [{ task_id: 1, username: 'testuser' }],
  children: [],
};

const mockTaskRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findAllCategories: jest.fn(),
};

const mockLoggerService = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('TaskService', () => {
  let service: TaskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: TaskRepository, useValue: mockTaskRepository },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('タスク一覧を返す', async () => {
      mockTaskRepository.findAll.mockResolvedValue([mockTask]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].title).toBe('テストタスク');
      expect(result[0].assignees).toEqual(['testuser']);
    });

    it('タスクが存在しない場合は空配列を返す', async () => {
      mockTaskRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toHaveLength(0);
    });

    it('findAll の戻り値に is_completed が含まれる', async () => {
      mockTaskRepository.findAll.mockResolvedValue([mockTask]);

      const result = await service.findAll();

      expect(result[0]).toHaveProperty('is_completed');
      expect(result[0].is_completed).toBe(false);
    });

    it('is_completed が true のタスクを返す場合、戻り値の is_completed が true になる', async () => {
      const completedTask = { ...mockTask, is_completed: true };
      mockTaskRepository.findAll.mockResolvedValue([completedTask]);

      const result = await service.findAll();

      expect(result[0].is_completed).toBe(true);
    });
  });

  describe('findById', () => {
    it('指定IDのタスクを返す', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);

      const result = await service.findById(1);

      expect(result.id).toBe(1);
      expect(result.title).toBe('テストタスク');
    });

    it('存在しないIDの場合はNotFoundExceptionをスローする', async () => {
      mockTaskRepository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
      await expect(service.findById(999)).rejects.toThrow(
        MESSAGE.TASK.NOT_FOUND,
      );
    });

    it('findById の戻り値に is_completed が含まれる', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);

      const result = await service.findById(1);

      expect(result).toHaveProperty('is_completed');
      expect(result.is_completed).toBe(false);
    });
  });

  describe('create', () => {
    it('タスクを作成して返す', async () => {
      mockTaskRepository.create.mockResolvedValue(mockTask);

      const dto = {
        title: 'テストタスク',
        description: 'テスト説明',
        due_date: '2026-12-31T23:59:59.000Z',
        assignees: ['testuser'],
        created_by: 'testuser',
      };

      const result = await service.create(dto);

      expect(result.title).toBe('テストタスク');
      expect(mockTaskRepository.create).toHaveBeenCalledWith({
        title: dto.title,
        description: dto.description,
        due_date: new Date(dto.due_date),
        priority: 'MEDIUM',
        category: null,
        parent_id: null,
        created_by: dto.created_by,
        assignees: ['testuser'],
      });
    });

    it('DBエラー時はInternalServerErrorExceptionをスローする', async () => {
      mockTaskRepository.create.mockRejectedValue(new Error('DB error'));

      const dto = {
        title: 'テストタスク',
        description: 'テスト説明',
        due_date: '2026-12-31T23:59:59.000Z',
        assignees: [],
        created_by: 'testuser',
      };

      await expect(service.create(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('update', () => {
    it('存在するタスクを更新して返す', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);
      const updatedTask = { ...mockTask, title: '更新後タスク', assignees: [] };
      mockTaskRepository.update.mockResolvedValue(updatedTask);

      const dto = { title: '更新後タスク' };
      const result = await service.update(1, dto, 'testuser');

      expect(result.title).toBe('更新後タスク');
    });

    it('存在しないIDの場合はNotFoundExceptionをスローする', async () => {
      mockTaskRepository.findById.mockResolvedValue(null);

      await expect(service.update(999, { title: '更新' }, 'testuser')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('DBエラー時はInternalServerErrorExceptionをスローする', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);
      mockTaskRepository.update.mockRejectedValue(new Error('DB error'));

      await expect(service.update(1, { title: '更新' }, 'testuser')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('is_completed: true を渡すと Repository の update が is_completed: true で呼ばれる', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);
      const completedTask = { ...mockTask, is_completed: true, assignees: [] };
      mockTaskRepository.update.mockResolvedValue(completedTask);

      await service.update(1, { is_completed: true }, 'testuser');

      expect(mockTaskRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ is_completed: true }),
      );
    });

    it('is_completed: false を渡すと Repository の update が is_completed: false で呼ばれる', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);
      const uncompletedTask = { ...mockTask, is_completed: false, assignees: [] };
      mockTaskRepository.update.mockResolvedValue(uncompletedTask);

      await service.update(1, { is_completed: false }, 'testuser');

      expect(mockTaskRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ is_completed: false }),
      );
    });

    it('is_completed を渡さない場合も正常に更新が実行される', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);
      const updatedTask = { ...mockTask, title: 'タイトル変更', assignees: [] };
      mockTaskRepository.update.mockResolvedValue(updatedTask);

      const result = await service.update(1, { title: 'タイトル変更' }, 'testuser');

      expect(result.title).toBe('タイトル変更');
      expect(mockTaskRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ title: 'タイトル変更' }),
      );
    });

    // --- closed_by ロジックのテスト ---

    it('is_completed が false → true に変化したとき、closed_by に requestUsername がセットされる', async () => {
      // 既存タスクは is_completed: false
      const incompleteTask = { ...mockTask, is_completed: false, assignees: [] };
      mockTaskRepository.findById.mockResolvedValue(incompleteTask);
      const completedTask = { ...mockTask, is_completed: true, closed_by: 'closer', assignees: [] };
      mockTaskRepository.update.mockResolvedValue(completedTask);

      await service.update(1, { is_completed: true }, 'closer');

      expect(mockTaskRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ closed_by: 'closer' }),
      );
    });

    it('is_completed が true → false に変化したとき、closed_by が null にクリアされる', async () => {
      // 既存タスクは is_completed: true
      const completedTask = { ...mockTask, is_completed: true, closed_by: 'closer', assignees: [] };
      mockTaskRepository.findById.mockResolvedValue(completedTask);
      const revertedTask = { ...mockTask, is_completed: false, closed_by: null, assignees: [] };
      mockTaskRepository.update.mockResolvedValue(revertedTask);

      await service.update(1, { is_completed: false }, 'closer');

      expect(mockTaskRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ closed_by: null }),
      );
    });

    it('is_completed が false → false で変化なしのとき、closed_by が Repository に渡されない', async () => {
      // 既存タスクは is_completed: false、dtoも false
      const incompleteTask = { ...mockTask, is_completed: false, assignees: [] };
      mockTaskRepository.findById.mockResolvedValue(incompleteTask);
      mockTaskRepository.update.mockResolvedValue(incompleteTask);

      await service.update(1, { is_completed: false }, 'testuser');

      const calledWith = mockTaskRepository.update.mock.calls[0][1] as Record<string, unknown>;
      expect('closed_by' in calledWith).toBe(false);
    });

    it('is_completed が true → true で変化なしのとき、closed_by が Repository に渡されない', async () => {
      // 既存タスクは is_completed: true、dtoも true
      const completedTask = { ...mockTask, is_completed: true, closed_by: 'closer', assignees: [] };
      mockTaskRepository.findById.mockResolvedValue(completedTask);
      mockTaskRepository.update.mockResolvedValue(completedTask);

      await service.update(1, { is_completed: true }, 'closer');

      const calledWith = mockTaskRepository.update.mock.calls[0][1] as Record<string, unknown>;
      expect('closed_by' in calledWith).toBe(false);
    });
  });

  describe('remove', () => {
    it('存在するタスクを削除する', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);
      mockTaskRepository.delete.mockResolvedValue(undefined);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(mockTaskRepository.delete).toHaveBeenCalledWith(1);
    });

    it('存在しないIDの場合はNotFoundExceptionをスローする', async () => {
      mockTaskRepository.findById.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('DBエラー時はInternalServerErrorExceptionをスローする', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);
      mockTaskRepository.delete.mockRejectedValue(new Error('DB error'));

      await expect(service.remove(1)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
