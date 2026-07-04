import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Event } from '@prisma/client';
import { EventRepository } from '../repository/event.repository';
import {
  CreateEventDto,
  UpdateEventDto,
  EventResponseDto,
} from '../dto/event.dto';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';

const CONTEXT = 'EventService';

@Injectable()
export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 全予定を取得する
   */
  async findAll(): Promise<EventResponseDto[]> {
    this.logger.log(CONTEXT, '予定一覧取得開始');
    const events = await this.eventRepository.findAll();
    return events.map((e) => this.toResponseDto(e));
  }

  /**
   * 指定IDの予定を取得する。存在しない場合は404例外をスローする
   */
  async findById(id: number): Promise<EventResponseDto> {
    this.logger.log(CONTEXT, `予定取得開始: id=${id}`);
    const event = await this.eventRepository.findById(id);
    if (!event) {
      this.logger.warn(CONTEXT, `予定が見つかりません: id=${id}`);
      throw new NotFoundException(MESSAGE.EVENT.NOT_FOUND);
    }
    return this.toResponseDto(event);
  }

  /**
   * 予定を作成する。作成者はControllerから渡されたJWT認証済みユーザー名を使用する
   */
  async create(
    dto: CreateEventDto,
    createdBy: string,
  ): Promise<EventResponseDto> {
    this.logger.log(CONTEXT, `予定作成開始: ${dto.title}`);
    try {
      const event = await this.eventRepository.create({
        title: dto.title,
        description: dto.description ?? '',
        start_at: new Date(dto.start_at),
        end_at: new Date(dto.end_at),
        created_by: createdBy,
      });
      this.logger.log(CONTEXT, `予定作成完了: id=${event.id}`);
      return this.toResponseDto(event);
    } catch (error) {
      this.logger.error(CONTEXT, `予定作成失敗: ${String(error)}`);
      throw new InternalServerErrorException(MESSAGE.EVENT.CREATE_FAILED);
    }
  }

  /**
   * 予定を更新する。作成者のみ操作可能。存在しない場合は404、権限なしの場合は403例外をスローする
   */
  async update(
    id: number,
    dto: UpdateEventDto,
    requestUsername: string,
  ): Promise<EventResponseDto> {
    this.logger.log(CONTEXT, `予定更新開始: id=${id}`);

    const existing = await this.eventRepository.findById(id);
    if (!existing) {
      this.logger.warn(CONTEXT, `予定が見つかりません: id=${id}`);
      throw new NotFoundException(MESSAGE.EVENT.NOT_FOUND);
    }

    if (existing.created_by !== requestUsername) {
      this.logger.warn(
        CONTEXT,
        `予定更新権限なし: id=${id}, user=${requestUsername}`,
      );
      throw new ForbiddenException(MESSAGE.EVENT.FORBIDDEN);
    }

    try {
      const event = await this.eventRepository.update(id, {
        title: dto.title,
        description: dto.description,
        start_at: dto.start_at ? new Date(dto.start_at) : undefined,
        end_at: dto.end_at ? new Date(dto.end_at) : undefined,
      });
      this.logger.log(CONTEXT, `予定更新完了: id=${id}`);
      return this.toResponseDto(event);
    } catch (error) {
      this.logger.error(CONTEXT, `予定更新失敗: id=${id} - ${String(error)}`);
      throw new InternalServerErrorException(MESSAGE.EVENT.UPDATE_FAILED);
    }
  }

  /**
   * 予定を削除する。作成者のみ操作可能。存在しない場合は404、権限なしの場合は403例外をスローする
   */
  async remove(id: number, requestUsername: string): Promise<void> {
    this.logger.log(CONTEXT, `予定削除開始: id=${id}`);

    const existing = await this.eventRepository.findById(id);
    if (!existing) {
      this.logger.warn(CONTEXT, `予定が見つかりません: id=${id}`);
      throw new NotFoundException(MESSAGE.EVENT.NOT_FOUND);
    }

    if (existing.created_by !== requestUsername) {
      this.logger.warn(
        CONTEXT,
        `予定削除権限なし: id=${id}, user=${requestUsername}`,
      );
      throw new ForbiddenException(MESSAGE.EVENT.FORBIDDEN);
    }

    try {
      await this.eventRepository.delete(id);
      this.logger.log(CONTEXT, `予定削除完了: id=${id}`);
    } catch (error) {
      this.logger.error(CONTEXT, `予定削除失敗: id=${id} - ${String(error)}`);
      throw new InternalServerErrorException(MESSAGE.EVENT.DELETE_FAILED);
    }
  }

  /**
   * Prisma の Event モデルを EventResponseDto に変換する
   */
  private toResponseDto(event: Event): EventResponseDto {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      start_at: event.start_at.toISOString(),
      end_at: event.end_at.toISOString(),
      created_by: event.created_by,
      created_at: event.created_at.toISOString(),
      updated_at: event.updated_at.toISOString(),
    };
  }
}
