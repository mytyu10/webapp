import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  TaskRepository,
  TaskWithRelations,
} from '../repository/task.repository';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskResponseDto,
  NotificationResponseDto,
  Priority,
  PRIORITY_VALUES,
} from '../dto/task.dto';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';
import { BatchQueueService } from 'src/common/service/batch-queue.service';
import { TaskNotification } from '@prisma/client';

const CONTEXT = 'TaskService';

/** デフォルト優先度 */
const DEFAULT_PRIORITY: Priority = 'MEDIUM';

@Injectable()
export class TaskService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly logger: LoggerService,
    private readonly taskQueueService: BatchQueueService,
  ) {}

  /**
   * 指定ユーザーが作成者または担当者であるタスク一覧を取得する
   */
  async findAll(username: string): Promise<TaskResponseDto[]> {
    this.logger.log(CONTEXT, `タスク一覧取得開始: user=${username}`);
    const tasks = await this.taskRepository.findAll(username);
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
   * タスク更新をキューに追加する。キューが実際に処理を完了した後に結果を返す
   */
  async update(
    id: number,
    dto: UpdateTaskDto,
    requestUsername: string,
  ): Promise<TaskResponseDto> {
    this.logger.log(CONTEXT, `タスク更新キュー追加: id=${id}`);
    return this.taskQueueService.enqueue(() =>
      this.executeUpdate(id, dto, requestUsername),
    );
  }

  /**
   * タスクを実際に更新する（キュー内から呼び出される）。
   * is_completed が true に変化したとき closed_by にリクエストユーザー名をセット、
   * false に戻したとき closed_by を null にクリアする
   */
  private async executeUpdate(
    id: number,
    dto: UpdateTaskDto,
    requestUsername: string,
  ): Promise<TaskResponseDto> {
    this.logger.log(CONTEXT, `タスク更新実行: id=${id}`);

    const existing = await this.taskRepository.findById(id);
    if (!existing) {
      this.logger.warn(CONTEXT, `タスクが見つかりません: id=${id}`);
      throw new NotFoundException(MESSAGE.TASK.NOT_FOUND);
    }

    /** is_completed の変化に基づいて closed_by を決定する */
    let closedByUpdate: { closed_by: string | null } | Record<string, never> =
      {};
    if (dto.is_completed !== undefined) {
      const wasCompleted = existing.is_completed;
      const willBeCompleted = dto.is_completed;
      if (!wasCompleted && willBeCompleted) {
        closedByUpdate = { closed_by: requestUsername };
      } else if (wasCompleted && !willBeCompleted) {
        closedByUpdate = { closed_by: null };
      }
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
        ...closedByUpdate,
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
   * 指定ユーザーが作成者または担当者であるタスクの使用中カテゴリ一覧を取得する
   */
  async findAllCategories(username: string): Promise<string[]> {
    this.logger.log(CONTEXT, `カテゴリ一覧取得開始: user=${username}`);
    try {
      return await this.taskRepository.findAllCategories(username);
    } catch (error) {
      this.logger.error(CONTEXT, `カテゴリ一覧取得失敗: ${String(error)}`);
      throw new InternalServerErrorException(
        MESSAGE.TASK.CATEGORIES_FETCH_FAILED,
      );
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
   * TaskNotification を NotificationResponseDto に変換する
   */
  private toNotificationDto(n: TaskNotification): NotificationResponseDto {
    return {
      id: n.id,
      task_id: n.task_id,
      notify_at: n.notify_at.toISOString(),
      is_sent: n.is_sent,
    };
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
      closed_by: task.closed_by,
      assignees: task.assignees.map((a) => a.username),
      notifications: task.notifications.map((n) => this.toNotificationDto(n)),
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
        closed_by: child.closed_by,
        assignees: child.assignees.map((a) => a.username),
        notifications: child.notifications.map((n) =>
          this.toNotificationDto(n),
        ),
        children: [],
      })),
    };
  }
}
