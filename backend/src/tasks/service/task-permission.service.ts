import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { TaskPermissionRepository } from '../repository/task-permission.repository';
import { TaskRepository } from '../repository/task.repository';
import {
  CreatePermissionDto,
  PermissionResponseDto,
} from 'src/permissions/permission.dto';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';

const CONTEXT = 'TaskPermissionService';

@Injectable()
export class TaskPermissionService {
  constructor(
    private readonly taskPermissionRepository: TaskPermissionRepository,
    private readonly taskRepository: TaskRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * タスクの権限一覧を取得する
   */
  async findAll(
    taskId: number,
    requestUsername: string,
  ): Promise<PermissionResponseDto[]> {
    this.logger.log(
      CONTEXT,
      `タスク権限一覧取得開始: taskId=${taskId}, user=${requestUsername}`,
    );

    await this.ensureOwner(taskId, requestUsername);

    try {
      const records = await this.taskPermissionRepository.findAll(taskId);
      return records.map((r) => ({
        username: r.username,
        permission: r.permission,
      }));
    } catch (error) {
      this.logger.error(CONTEXT, `タスク権限一覧取得失敗: ${String(error)}`);
      throw new InternalServerErrorException(MESSAGE.PERMISSION.FETCH_FAILED);
    }
  }

  /**
   * タスクへの権限を付与する（作成者のみ実行可能）
   */
  async add(
    taskId: number,
    dto: CreatePermissionDto,
    requestUsername: string,
  ): Promise<PermissionResponseDto> {
    this.logger.log(
      CONTEXT,
      `タスク権限付与開始: taskId=${taskId}, target=${dto.username}, permission=${dto.permission}`,
    );

    await this.ensureOwner(taskId, requestUsername);

    try {
      const record = await this.taskPermissionRepository.upsert(
        taskId,
        dto.username,
        dto.permission,
      );
      this.logger.log(
        CONTEXT,
        `タスク権限付与完了: taskId=${taskId}, target=${dto.username}`,
      );
      return { username: record.username, permission: record.permission };
    } catch (error) {
      this.logger.error(CONTEXT, `タスク権限付与失敗: ${String(error)}`);
      throw new InternalServerErrorException(MESSAGE.PERMISSION.ADD_FAILED);
    }
  }

  /**
   * タスクの権限を削除する（作成者のみ実行可能）
   */
  async remove(
    taskId: number,
    targetUsername: string,
    requestUsername: string,
  ): Promise<void> {
    this.logger.log(
      CONTEXT,
      `タスク権限削除開始: taskId=${taskId}, target=${targetUsername}`,
    );

    await this.ensureOwner(taskId, requestUsername);

    const existing = await this.taskPermissionRepository.findOne(
      taskId,
      targetUsername,
    );
    if (!existing) {
      throw new NotFoundException(MESSAGE.PERMISSION.NOT_FOUND);
    }

    try {
      await this.taskPermissionRepository.delete(taskId, targetUsername);
      this.logger.log(
        CONTEXT,
        `タスク権限削除完了: taskId=${taskId}, target=${targetUsername}`,
      );
    } catch (error) {
      this.logger.error(CONTEXT, `タスク権限削除失敗: ${String(error)}`);
      throw new InternalServerErrorException(MESSAGE.PERMISSION.REMOVE_FAILED);
    }
  }

  /**
   * リクエストユーザーがタスクの作成者であることを確認する。
   * タスクが存在しない場合は 404、作成者でない場合は 403 を返す
   */
  private async ensureOwner(
    taskId: number,
    requestUsername: string,
  ): Promise<void> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new NotFoundException(MESSAGE.TASK.NOT_FOUND);
    }
    if (task.created_by !== requestUsername) {
      throw new ForbiddenException(MESSAGE.PERMISSION.OWNER_ONLY);
    }
  }
}
