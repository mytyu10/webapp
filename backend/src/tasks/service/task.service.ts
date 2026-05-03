import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { TaskRepository, TaskWithRelations } from '../repository/task.repository';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskResponseDto,
  Priority,
  PRIORITY_VALUES,
} from '../dto/task.dto';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';

const CONTEXT = 'TaskService';

/** デフォルト優先度 */
const DEFAULT_PRIORITY: Priority = 'MEDIUM';

@Injectable()
export class TaskService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * タスク一覧を取得する
   */
  async findAll(): Promise<TaskResponseDto[]> {
    this.logger.log(CONTEXT, 'タスク一覧取得開始');
    const tasks = await this.taskRepository.findAll();
    return tasks.map((task) => this.toResponseDto(task));
  }

  /**
   * 指定IDのタスクを取得する。存在しない場合は404例外をスローする
   */
  async findById(id: number): Promise<TaskResponseDto> {
    this.logger.log(CONTEXT, `タスク取得開始: id=${id}`);
    const task = await this.taskRepository.findById(id);
    if (!task) {
      this.logger.warn(CONTEXT, `タスクが見つかりません: id=${id}`);
      throw new NotFoundException(MESSAGE.TASK.NOT_FOUND);
    }
    return this.toResponseDto(task);
  }

  /**
   * タスクを作成する
   */
  async create(dto: CreateTaskDto): Promise<TaskResponseDto> {
    this.logger.log(CONTEXT, `タスク作成開始: ${dto.title}`);
    try {
      const priority = this.normalizePriority(dto.priority);
      const task = await this.taskRepository.create({
        title: dto.title,
        description: dto.description,
        due_date: new Date(dto.due_date),
        priority,
        category: dto.category ?? null,
        parent_id: dto.parent_id ?? null,
        created_by: dto.created_by,
        assignees: dto.assignees ?? [],
      });
      this.logger.log(CONTEXT, `タスク作成完了: id=${task.id}`);
      return this.toResponseDto(task);
    } catch (error) {
      this.logger.error(CONTEXT, `タスク作成失敗: ${String(error)}`);
      throw new InternalServerErrorException(MESSAGE.TASK.CREATE_FAILED);
    }
  }

  /**
   * タスクを更新する。存在しない場合は404例外をスローする
   */
  async update(id: number, dto: UpdateTaskDto): Promise<TaskResponseDto> {
    this.logger.log(CONTEXT, `タスク更新開始: id=${id}`);

    const existing = await this.taskRepository.findById(id);
    if (!existing) {
      this.logger.warn(CONTEXT, `タスクが見つかりません: id=${id}`);
      throw new NotFoundException(MESSAGE.TASK.NOT_FOUND);
    }

    try {
      const task = await this.taskRepository.update(id, {
        title: dto.title,
        description: dto.description,
        due_date: dto.due_date ? new Date(dto.due_date) : undefined,
        priority: dto.priority,
        category: dto.category,
        parent_id: dto.parent_id,
        assignees: dto.assignees,
        is_completed: dto.is_completed,
      });
      this.logger.log(CONTEXT, `タスク更新完了: id=${id}`);
      return this.toResponseDto(task);
    } catch (error) {
      this.logger.error(CONTEXT, `タスク更新失敗: id=${id} - ${String(error)}`);
      throw new InternalServerErrorException(MESSAGE.TASK.UPDATE_FAILED);
    }
  }

  /**
   * タスクを削除する。存在しない場合は404例外をスローする
   */
  async remove(id: number): Promise<void> {
    this.logger.log(CONTEXT, `タスク削除開始: id=${id}`);

    const existing = await this.taskRepository.findById(id);
    if (!existing) {
      this.logger.warn(CONTEXT, `タスクが見つかりません: id=${id}`);
      throw new NotFoundException(MESSAGE.TASK.NOT_FOUND);
    }

    try {
      await this.taskRepository.delete(id);
      this.logger.log(CONTEXT, `タスク削除完了: id=${id}`);
    } catch (error) {
      this.logger.error(CONTEXT, `タスク削除失敗: id=${id} - ${String(error)}`);
      throw new InternalServerErrorException(MESSAGE.TASK.DELETE_FAILED);
    }
  }

  /**
   * 使用中のカテゴリ一覧を取得する
   */
  async findAllCategories(): Promise<string[]> {
    this.logger.log(CONTEXT, 'カテゴリ一覧取得開始');
    try {
      return await this.taskRepository.findAllCategories();
    } catch (error) {
      this.logger.error(CONTEXT, `カテゴリ一覧取得失敗: ${String(error)}`);
      throw new InternalServerErrorException(MESSAGE.TASK.CATEGORIES_FETCH_FAILED);
    }
  }

  /**
   * 優先度文字列をPriority型に正規化する。無効な値はデフォルト値を返す
   */
  private normalizePriority(priority?: Priority): Priority {
    if (priority && PRIORITY_VALUES.includes(priority)) {
      return priority;
    }
    return DEFAULT_PRIORITY;
  }

  /**
   * TaskWithRelations を TaskResponseDto に変換する
   */
  private toResponseDto(task: TaskWithRelations): TaskResponseDto {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      due_date: task.due_date.toISOString(),
      priority: this.normalizePriority(task.priority as Priority),
      category: task.category,
      parent_id: task.parent_id,
      created_by: task.created_by,
      created_at: task.created_at.toISOString(),
      updated_at: task.updated_at.toISOString(),
      is_completed: task.is_completed,
      assignees: task.assignees.map((a) => a.username),
      children: task.children.map((child) => ({
        id: child.id,
        title: child.title,
        description: child.description,
        due_date: child.due_date.toISOString(),
        priority: this.normalizePriority(child.priority as Priority),
        category: child.category,
        parent_id: child.parent_id,
        created_by: child.created_by,
        created_at: child.created_at.toISOString(),
        updated_at: child.updated_at.toISOString(),
        is_completed: child.is_completed,
        assignees: child.assignees.map((a) => a.username),
        children: [],
      })),
    };
  }
}
