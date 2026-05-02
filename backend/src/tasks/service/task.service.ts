import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { TaskRepository } from '../repository/task.repository';
import { CreateTaskDto, UpdateTaskDto, TaskResponseDto } from '../dto/task.dto';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';

const CONTEXT = 'TaskService';

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
      const task = await this.taskRepository.create({
        title: dto.title,
        description: dto.description,
        due_date: new Date(dto.due_date),
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
        assignees: dto.assignees,
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
   * TaskWithAssignees を TaskResponseDto に変換する
   */
  private toResponseDto(
    task: Awaited<ReturnType<TaskRepository['findById']>> & object,
  ): TaskResponseDto {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      due_date: task.due_date.toISOString(),
      created_at: task.created_at.toISOString(),
      updated_at: task.updated_at.toISOString(),
      assignees: task.assignees.map((a) => a.username),
    };
  }
}
