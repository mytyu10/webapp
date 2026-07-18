import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EventPermissionRepository } from '../repository/event-permission.repository';
import { EventRepository } from '../repository/event.repository';
import {
  CreatePermissionDto,
  PermissionResponseDto,
} from 'src/permissions/permission.dto';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';

const CONTEXT = 'EventPermissionService';

@Injectable()
export class EventPermissionService {
  constructor(
    private readonly eventPermissionRepository: EventPermissionRepository,
    private readonly eventRepository: EventRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * イベントの権限一覧を取得する（作成者のみ実行可能）
   */
  async findAll(
    eventId: number,
    requestUsername: string,
  ): Promise<PermissionResponseDto[]> {
    this.logger.log(
      CONTEXT,
      `イベント権限一覧取得開始: eventId=${eventId}, user=${requestUsername}`,
    );

    await this.ensureOwner(eventId, requestUsername);

    try {
      const records = await this.eventPermissionRepository.findAll(eventId);
      return records.map((r) => ({
        username: r.username,
        permission: r.permission,
      }));
    } catch (error) {
      this.logger.error(CONTEXT, `イベント権限一覧取得失敗: ${String(error)}`);
      throw new InternalServerErrorException(
        MESSAGE.EVENT.PERMISSION_FETCH_FAILED,
      );
    }
  }

  /**
   * イベントへの権限を付与する（作成者のみ実行可能）
   */
  async add(
    eventId: number,
    dto: CreatePermissionDto,
    requestUsername: string,
  ): Promise<PermissionResponseDto> {
    this.logger.log(
      CONTEXT,
      `イベント権限付与開始: eventId=${eventId}, target=${dto.username}, permission=${dto.permission}`,
    );

    await this.ensureOwner(eventId, requestUsername);

    try {
      const record = await this.eventPermissionRepository.upsert(
        eventId,
        dto.username,
        dto.permission,
      );
      this.logger.log(
        CONTEXT,
        `イベント権限付与完了: eventId=${eventId}, target=${dto.username}`,
      );
      return { username: record.username, permission: record.permission };
    } catch (error) {
      this.logger.error(CONTEXT, `イベント権限付与失敗: ${String(error)}`);
      throw new InternalServerErrorException(
        MESSAGE.EVENT.PERMISSION_ADD_FAILED,
      );
    }
  }

  /**
   * イベントの権限を削除する（作成者のみ実行可能）
   */
  async remove(
    eventId: number,
    targetUsername: string,
    requestUsername: string,
  ): Promise<void> {
    this.logger.log(
      CONTEXT,
      `イベント権限削除開始: eventId=${eventId}, target=${targetUsername}`,
    );

    await this.ensureOwner(eventId, requestUsername);

    const existing = await this.eventPermissionRepository.findOne(
      eventId,
      targetUsername,
    );
    if (!existing) {
      throw new NotFoundException(MESSAGE.PERMISSION.NOT_FOUND);
    }

    try {
      await this.eventPermissionRepository.delete(eventId, targetUsername);
      this.logger.log(
        CONTEXT,
        `イベント権限削除完了: eventId=${eventId}, target=${targetUsername}`,
      );
    } catch (error) {
      this.logger.error(CONTEXT, `イベント権限削除失敗: ${String(error)}`);
      throw new InternalServerErrorException(
        MESSAGE.EVENT.PERMISSION_REMOVE_FAILED,
      );
    }
  }

  /**
   * リクエストユーザーがイベントの作成者であることを確認する。
   * イベントが存在しない場合は 404、作成者でない場合は 403 を返す
   */
  private async ensureOwner(
    eventId: number,
    requestUsername: string,
  ): Promise<void> {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new NotFoundException(MESSAGE.EVENT.NOT_FOUND);
    }
    if (event.created_by !== requestUsername) {
      throw new ForbiddenException(MESSAGE.PERMISSION.OWNER_ONLY);
    }
  }
}
