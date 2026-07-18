import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { TaskNotificationRepository } from '../repository/task-notification.repository';
import { NotificationResponseDto } from '../dto/task.dto';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';

const CONTEXT = 'TaskNotificationService';

@Injectable()
export class TaskNotificationService {
  constructor(
    private readonly notificationRepository: TaskNotificationRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * タスクに通知を追加する
   */
  async addNotification(
    taskId: number,
    notifyAt: string,
  ): Promise<NotificationResponseDto> {
    this.logger.log(CONTEXT, `通知追加開始: taskId=${taskId}`);
    try {
      const notification = await this.notificationRepository.create(
        taskId,
        new Date(notifyAt),
      );
      this.logger.log(CONTEXT, `通知追加完了: id=${notification.id}`);
      return this.toResponseDto(notification);
    } catch (error) {
      this.logger.error(CONTEXT, `通知追加失敗: ${String(error)}`);
      throw new InternalServerErrorException(
        MESSAGE.NOTIFICATION.CREATE_FAILED,
      );
    }
  }

  /**
   * タスクの通知一覧を取得する
   */
  async getNotifications(taskId: number): Promise<NotificationResponseDto[]> {
    this.logger.log(CONTEXT, `通知一覧取得開始: taskId=${taskId}`);
    try {
      const notifications =
        await this.notificationRepository.findByTaskId(taskId);
      return notifications.map((n) => this.toResponseDto(n));
    } catch (error) {
      this.logger.error(CONTEXT, `通知一覧取得失敗: ${String(error)}`);
      throw new InternalServerErrorException(MESSAGE.NOTIFICATION.FETCH_FAILED);
    }
  }

  /**
   * 通知を削除する。notificationId が taskId に属さない場合は NotFoundException を投げる
   */
  async removeNotification(
    notificationId: number,
    taskId: number,
  ): Promise<void> {
    this.logger.log(
      CONTEXT,
      `通知削除開始: id=${notificationId}, taskId=${taskId}`,
    );
    try {
      const deletedCount = await this.notificationRepository.delete(
        notificationId,
        taskId,
      );
      if (deletedCount === 0) {
        throw new NotFoundException(MESSAGE.NOTIFICATION.INVALID_TASK);
      }
      this.logger.log(CONTEXT, `通知削除完了: id=${notificationId}`);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        CONTEXT,
        `通知削除失敗: id=${notificationId} - ${String(error)}`,
      );
      throw new InternalServerErrorException(
        MESSAGE.NOTIFICATION.DELETE_FAILED,
      );
    }
  }

  /**
   * TaskNotification を NotificationResponseDto に変換する
   */
  private toResponseDto(notification: {
    id: number;
    task_id: number;
    notify_at: Date;
    is_sent: boolean;
  }): NotificationResponseDto {
    return {
      id: notification.id,
      task_id: notification.task_id,
      notify_at: notification.notify_at.toISOString(),
      is_sent: notification.is_sent,
    };
  }
}
