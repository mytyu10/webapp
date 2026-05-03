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
      const result = await service.update(1, dto);

      expect(result.title).toBe('更新後タスク');
    });

    it('存在しないIDの場合はNotFoundExceptionをスローする', async () => {
      mockTaskRepository.findById.mockResolvedValue(null);

      await expect(service.update(999, { title: '更新' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('DBエラー時はInternalServerErrorExceptionをスローする', async () => {
      mockTaskRepository.findById.mockResolvedValue(mockTask);
      mockTaskRepository.update.mockRejectedValue(new Error('DB error'));

      await expect(service.update(1, { title: '更新' })).rejects.toThrow(
        InternalServerErrorException,
      );
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
