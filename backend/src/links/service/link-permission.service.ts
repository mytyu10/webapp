import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { LinkPermissionRepository } from '../repository/link-permission.repository';
import { LinkRepository } from '../repository/link.repository';
import {
  CreatePermissionDto,
  PermissionResponseDto,
} from 'src/permissions/permission.dto';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';

const CONTEXT = 'LinkPermissionService';

@Injectable()
export class LinkPermissionService {
  constructor(
    private readonly linkPermissionRepository: LinkPermissionRepository,
    private readonly linkRepository: LinkRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * リンクアイテムの権限一覧を取得する（作成者のみ）
   */
  async findAll(
    linkItemId: number,
    requestUsername: string,
  ): Promise<PermissionResponseDto[]> {
    this.logger.log(
      CONTEXT,
      `リンク権限一覧取得開始: linkItemId=${linkItemId}, user=${requestUsername}`,
    );

    await this.ensureOwner(linkItemId, requestUsername);

    try {
      const records = await this.linkPermissionRepository.findAll(linkItemId);
      return records.map((r) => ({
        username: r.username,
        permission: r.permission,
      }));
    } catch (error) {
      this.logger.error(CONTEXT, `リンク権限一覧取得失敗: ${String(error)}`);
      throw new InternalServerErrorException(MESSAGE.PERMISSION.FETCH_FAILED);
    }
  }

  /**
   * リンクアイテムへの権限を付与する（作成者のみ）
   */
  async add(
    linkItemId: number,
    dto: CreatePermissionDto,
    requestUsername: string,
  ): Promise<PermissionResponseDto> {
    this.logger.log(
      CONTEXT,
      `リンク権限付与開始: linkItemId=${linkItemId}, target=${dto.username}, permission=${dto.permission}`,
    );

    await this.ensureOwner(linkItemId, requestUsername);

    try {
      const record = await this.linkPermissionRepository.upsert(
        linkItemId,
        dto.username,
        dto.permission,
      );
      this.logger.log(
        CONTEXT,
        `リンク権限付与完了: linkItemId=${linkItemId}, target=${dto.username}`,
      );
      return { username: record.username, permission: record.permission };
    } catch (error) {
      this.logger.error(CONTEXT, `リンク権限付与失敗: ${String(error)}`);
      throw new InternalServerErrorException(MESSAGE.PERMISSION.ADD_FAILED);
    }
  }

  /**
   * リンクアイテムの権限を削除する（作成者のみ）
   */
  async remove(
    linkItemId: number,
    targetUsername: string,
    requestUsername: string,
  ): Promise<void> {
    this.logger.log(
      CONTEXT,
      `リンク権限削除開始: linkItemId=${linkItemId}, target=${targetUsername}`,
    );

    await this.ensureOwner(linkItemId, requestUsername);

    const existing = await this.linkPermissionRepository.findOne(
      linkItemId,
      targetUsername,
    );
    if (!existing) {
      throw new NotFoundException(MESSAGE.PERMISSION.NOT_FOUND);
    }

    try {
      await this.linkPermissionRepository.delete(linkItemId, targetUsername);
      this.logger.log(
        CONTEXT,
        `リンク権限削除完了: linkItemId=${linkItemId}, target=${targetUsername}`,
      );
    } catch (error) {
      this.logger.error(CONTEXT, `リンク権限削除失敗: ${String(error)}`);
      throw new InternalServerErrorException(MESSAGE.PERMISSION.REMOVE_FAILED);
    }
  }

  /**
   * リクエストユーザーがリンクアイテムの作成者であることを確認する。
   * リンクアイテムが存在しない場合は 404、作成者でない場合は 403 を返す
   */
  private async ensureOwner(
    linkItemId: number,
    requestUsername: string,
  ): Promise<void> {
    const item = await this.linkRepository.findById(linkItemId);
    if (!item) {
      throw new NotFoundException(MESSAGE.LINK.NOT_FOUND);
    }
    if (item.created_by !== requestUsername) {
      throw new ForbiddenException(MESSAGE.PERMISSION.OWNER_ONLY);
    }
  }
}
