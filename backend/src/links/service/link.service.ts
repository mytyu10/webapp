import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { LinkRepository } from '../repository/link.repository';
import {
  CreateLinkItemDto,
  UpdateLinkItemDto,
  LinkItemResponseDto,
  LinkItemType,
} from '../dto/link.dto';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';

const CONTEXT = 'LinkService';

/** FOLDER タイプの定数 */
const FOLDER_TYPE: LinkItemType = 'FOLDER';

/** LINK タイプの定数 */
const LINK_TYPE: LinkItemType = 'LINK';

@Injectable()
export class LinkService {
  constructor(
    private readonly linkRepository: LinkRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 指定ユーザーが作成者であるリンク/フォルダをツリー構造で取得する。
   * parent_id が null の要素をルートとして配置し、FOLDER の children に配下要素を再帰的に格納する。
   * LINK の children は常に空配列とする
   */
  async findAll(username: string): Promise<LinkItemResponseDto[]> {
    this.logger.log(CONTEXT, `リンク一覧取得開始: user=${username}`);
    const all = await this.linkRepository.findAll(username);

    /** フラット配列を Map に変換してツリー構築に使用する */
    const map = new Map<number, LinkItemResponseDto>();
    for (const item of all) {
      map.set(item.id, {
        id: item.id,
        title: item.title,
        url: item.url,
        description: item.description,
        type: item.type as LinkItemType,
        parent_id: item.parent_id,
        order: item.order,
        created_by: item.created_by,
        created_at: item.created_at.toISOString(),
        updated_at: item.updated_at.toISOString(),
        children: [],
      });
    }

    /** ルート要素（parent_id === null）を格納するリスト */
    const roots: LinkItemResponseDto[] = [];

    for (const item of all) {
      const dto = map.get(item.id)!;

      if (item.parent_id === null) {
        roots.push(dto);
      } else {
        const parent = map.get(item.parent_id);
        if (parent && parent.type === FOLDER_TYPE) {
          parent.children.push(dto);
        }
      }
    }

    return roots;
  }

  /**
   * リンク/フォルダを作成する。
   * type が LINK の場合は url が必須。parent_id が指定された場合は親が FOLDER であることを確認する
   */
  async create(
    dto: CreateLinkItemDto,
    username: string,
  ): Promise<LinkItemResponseDto> {
    this.logger.log(CONTEXT, `リンク作成開始: ${dto.title}`);

    if (dto.type === LINK_TYPE && !dto.url) {
      throw new BadRequestException(MESSAGE.LINK.URL_REQUIRED);
    }

    if (dto.parent_id !== undefined) {
      await this.validateParentIsFolder(dto.parent_id);
    }

    try {
      const item = await this.linkRepository.create({
        title: dto.title,
        url: dto.url ?? null,
        description: dto.description ?? '',
        type: dto.type,
        parent_id: dto.parent_id ?? null,
        order: dto.order ?? 0,
        created_by: username,
      });
      this.logger.log(CONTEXT, `リンク作成完了: id=${item.id}`);
      return this.toResponseDto(item);
    } catch (err: unknown) {
      this.logger.error(CONTEXT, `リンク作成失敗: ${String(err)}`);
      throw new InternalServerErrorException(MESSAGE.LINK.CREATE_FAILED);
    }
  }

  /**
   * リンク/フォルダを更新する。parent_id 変更時は親が FOLDER であることを確認する
   */
  async update(
    id: number,
    dto: UpdateLinkItemDto,
  ): Promise<LinkItemResponseDto> {
    this.logger.log(CONTEXT, `リンク更新開始: id=${id}`);

    const existing = await this.linkRepository.findById(id);
    if (!existing) {
      this.logger.warn(CONTEXT, `リンクが見つかりません: id=${id}`);
      throw new NotFoundException(MESSAGE.LINK.NOT_FOUND);
    }

    if (dto.parent_id !== undefined) {
      await this.validateParentIsFolder(dto.parent_id);
    }

    try {
      const updated = await this.linkRepository.update(id, {
        title: dto.title,
        url: dto.url,
        description: dto.description,
        parent_id: dto.parent_id,
        order: dto.order,
      });
      this.logger.log(CONTEXT, `リンク更新完了: id=${id}`);
      return this.toResponseDto(updated);
    } catch (err: unknown) {
      this.logger.error(CONTEXT, `リンク更新失敗: id=${id} - ${String(err)}`);
      throw new InternalServerErrorException(MESSAGE.LINK.UPDATE_FAILED);
    }
  }

  /**
   * リンク/フォルダを削除する。作成者のみ削除可能。FOLDER 削除時は子も Cascade で削除される
   */
  async delete(id: number, username: string): Promise<void> {
    this.logger.log(CONTEXT, `リンク削除開始: id=${id}`);

    const existing = await this.linkRepository.findById(id);
    if (!existing) {
      this.logger.warn(CONTEXT, `リンクが見つかりません: id=${id}`);
      throw new NotFoundException(MESSAGE.LINK.NOT_FOUND);
    }

    if (existing.created_by !== username) {
      this.logger.warn(CONTEXT, `削除権限なし: id=${id}, user=${username}`);
      throw new ForbiddenException(MESSAGE.LINK.FORBIDDEN);
    }

    try {
      await this.linkRepository.delete(id);
      this.logger.log(CONTEXT, `リンク削除完了: id=${id}`);
    } catch (err: unknown) {
      this.logger.error(CONTEXT, `リンク削除失敗: id=${id} - ${String(err)}`);
      throw new InternalServerErrorException(MESSAGE.LINK.DELETE_FAILED);
    }
  }

  /**
   * 指定IDの親要素が FOLDER タイプであることを検証する。
   * 存在しない場合・FOLDER でない場合は例外をスローする
   */
  private async validateParentIsFolder(parentId: number): Promise<void> {
    const parent = await this.linkRepository.findById(parentId);
    if (!parent) {
      throw new NotFoundException(MESSAGE.LINK.PARENT_NOT_FOUND);
    }
    if (parent.type !== FOLDER_TYPE) {
      throw new BadRequestException(MESSAGE.LINK.PARENT_NOT_FOLDER);
    }
  }

  /**
   * LinkItemRecord を LinkItemResponseDto に変換する（children は空配列で初期化）
   */
  private toResponseDto(item: {
    id: number;
    title: string;
    url: string | null;
    description: string;
    type: string;
    parent_id: number | null;
    order: number;
    created_by: string;
    created_at: Date;
    updated_at: Date;
  }): LinkItemResponseDto {
    return {
      id: item.id,
      title: item.title,
      url: item.url,
      description: item.description,
      type: item.type as LinkItemType,
      parent_id: item.parent_id,
      order: item.order,
      created_by: item.created_by,
      created_at: item.created_at.toISOString(),
      updated_at: item.updated_at.toISOString(),
      children: [],
    };
  }
}
