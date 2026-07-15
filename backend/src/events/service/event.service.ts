import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Event } from '@prisma/client';
import { EventRepository } from '../repository/event.repository';
import {
  CreateEventDto,
  CreateMultipleEventsDto,
  CreateRepeatEventDto,
  RepeatType,
  UpdateEventDto,
  UpdateRepeatGroupEventDto,
  EventResponseDto,
} from '../dto/event.dto';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';

const CONTEXT = 'EventService';

/** 繰り返し予定の最大生成件数 */
const REPEAT_MAX_COUNT = 100;

/** 予定色のデフォルト値 */
const DEFAULT_EVENT_COLOR = 'cyan';

@Injectable()
export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 指定ユーザーが作成者である予定一覧を取得する
   */
  async findAll(username: string): Promise<EventResponseDto[]> {
    this.logger.log(CONTEXT, `予定一覧取得開始: user=${username}`);
    const events = await this.eventRepository.findAll(username);
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
        color: dto.color ?? DEFAULT_EVENT_COLOR,
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
   * 複数の開始日時と終了日時を指定して同じタイトル・説明の予定を一括作成する。
   * start_times と end_times は同件数である必要がある
   */
  async createMultiple(
    dto: CreateMultipleEventsDto,
    createdBy: string,
  ): Promise<EventResponseDto[]> {
    this.logger.log(
      CONTEXT,
      `複数予定作成開始: ${dto.title}, 件数=${dto.start_times.length}`,
    );

    if (dto.start_times.length === 0) {
      throw new BadRequestException(MESSAGE.EVENT.START_TIMES_REQUIRED);
    }

    if (dto.start_times.length !== dto.end_times.length) {
      throw new BadRequestException(
        MESSAGE.EVENT.START_END_TIMES_LENGTH_MISMATCH,
      );
    }

    if (dto.start_times.length > REPEAT_MAX_COUNT) {
      throw new BadRequestException(MESSAGE.EVENT.REPEAT_LIMIT_EXCEEDED);
    }

    try {
      const color = dto.color ?? DEFAULT_EVENT_COLOR;
      const data = dto.start_times.map((startTimeStr, index) => ({
        title: dto.title,
        description: dto.description ?? '',
        start_at: new Date(startTimeStr),
        end_at: new Date(dto.end_times[index]),
        color,
        created_by: createdBy,
      }));

      const events = await this.eventRepository.createMany(data);
      this.logger.log(CONTEXT, `複数予定作成完了: ${events.length}件`);
      return events.map((e) => this.toResponseDto(e));
    } catch (error) {
      this.logger.error(CONTEXT, `複数予定作成失敗: ${String(error)}`);
      throw new InternalServerErrorException(
        MESSAGE.EVENT.CREATE_MULTIPLE_FAILED,
      );
    }
  }

  /**
   * 繰り返しルールに基づいて予定を一括作成する。
   * end_at - start_at の差分ミリ秒を保持し、各繰り返し日の end_at を算出する。
   * 同一グループの繰り返し予定には同じ repeat_group_id（UUID）を付与する。
   * - daily: interval 日ごとに繰り返す。days_of_week は無視する
   * - weekly: interval 週ごとに繰り返す。days_of_week が指定された場合はその曜日のみ対象とする
   * - monthly: interval ヶ月ごとに繰り返す。月末補正（例: 31日 → その月の末日）を行う。days_of_week は無視する
   */
  async createRepeat(
    dto: CreateRepeatEventDto,
    createdBy: string,
  ): Promise<EventResponseDto[]> {
    this.logger.log(
      CONTEXT,
      `繰り返し予定作成開始: ${dto.title}, type=${dto.repeat.type}`,
    );

    const startTimes = this.expandRepeatDates(dto);

    if (startTimes.length === 0) {
      throw new BadRequestException(MESSAGE.EVENT.START_TIMES_REQUIRED);
    }

    if (startTimes.length > REPEAT_MAX_COUNT) {
      throw new BadRequestException(MESSAGE.EVENT.REPEAT_LIMIT_EXCEEDED);
    }

    try {
      const baseStart = new Date(dto.start_at);
      const baseEnd = new Date(dto.end_at);
      const durationMs = baseEnd.getTime() - baseStart.getTime();
      const repeatGroupId = randomUUID();
      const color = dto.color ?? DEFAULT_EVENT_COLOR;

      const data = startTimes.map((startAt) => {
        const endAt = new Date(startAt.getTime() + durationMs);
        return {
          title: dto.title,
          description: dto.description ?? '',
          start_at: startAt,
          end_at: endAt,
          color,
          repeat_group_id: repeatGroupId,
          created_by: createdBy,
        };
      });

      const events = await this.eventRepository.createMany(data);
      this.logger.log(
        CONTEXT,
        `繰り返し予定作成完了: ${events.length}件, groupId=${repeatGroupId}`,
      );
      return events.map((e) => this.toResponseDto(e));
    } catch (error) {
      this.logger.error(CONTEXT, `繰り返し予定作成失敗: ${String(error)}`);
      throw new InternalServerErrorException(
        MESSAGE.EVENT.CREATE_MULTIPLE_FAILED,
      );
    }
  }

  /**
   * 繰り返しルールから開始日時の配列を展開する。
   * end_date と count の両方が未指定の場合は count=1 として扱う
   */
  private expandRepeatDates(dto: CreateRepeatEventDto): Date[] {
    const { repeat } = dto;
    const baseDate = new Date(dto.start_at);
    const endDate = repeat.end_date ? new Date(repeat.end_date) : null;
    const maxCount = repeat.count ?? (endDate ? REPEAT_MAX_COUNT : 1);

    const dates: Date[] = [];

    if (repeat.type === RepeatType.DAILY) {
      dates.push(
        ...this.expandDaily(baseDate, repeat.interval, endDate, maxCount),
      );
    } else if (repeat.type === RepeatType.WEEKLY) {
      dates.push(
        ...this.expandWeekly(
          baseDate,
          repeat.interval,
          repeat.days_of_week,
          endDate,
          maxCount,
        ),
      );
    } else if (repeat.type === RepeatType.MONTHLY) {
      dates.push(
        ...this.expandMonthly(baseDate, repeat.interval, endDate, maxCount),
      );
    }

    return dates;
  }

  /**
   * 毎日繰り返しの日付配列を生成する
   */
  private expandDaily(
    baseDate: Date,
    interval: number,
    endDate: Date | null,
    maxCount: number,
  ): Date[] {
    const dates: Date[] = [];
    const current = new Date(baseDate);

    while (dates.length < maxCount) {
      if (endDate && current > endDate) break;
      dates.push(new Date(current));
      current.setDate(current.getDate() + interval);
    }

    return dates;
  }

  /**
   * 毎週繰り返しの日付配列を生成する。
   * days_of_week が指定された場合はその曜日のみ対象とし、interval 週ごとに巡回する。
   * days_of_week が未指定の場合は baseDate の曜日を使用する
   */
  private expandWeekly(
    baseDate: Date,
    interval: number,
    daysOfWeek: number[] | undefined,
    endDate: Date | null,
    maxCount: number,
  ): Date[] {
    const dates: Date[] = [];

    if (!daysOfWeek || daysOfWeek.length === 0) {
      // 曜日指定なしの場合は baseDate の曜日をそのまま interval 週ごとに繰り返す
      const current = new Date(baseDate);
      while (dates.length < maxCount) {
        if (endDate && current > endDate) break;
        dates.push(new Date(current));
        current.setDate(current.getDate() + interval * 7);
      }
      return dates;
    }

    // 指定曜日がある場合: baseDate が属する週の月曜を起点に interval 週ごとに各曜日を生成する
    const sortedDays = [...daysOfWeek].sort((a, b) => a - b);
    const weekStart = this.getWeekStart(baseDate);

    let weekOffset = 0;
    while (dates.length < maxCount) {
      for (const day of sortedDays) {
        const candidate = new Date(weekStart);
        candidate.setDate(weekStart.getDate() + weekOffset * 7 + day);
        // 時分秒は baseDate に合わせる
        candidate.setHours(
          baseDate.getHours(),
          baseDate.getMinutes(),
          baseDate.getSeconds(),
          0,
        );

        if (candidate < baseDate) continue;
        if (endDate && candidate > endDate) return dates;
        if (dates.length >= maxCount) return dates;

        dates.push(new Date(candidate));
      }
      weekOffset += interval;
    }

    return dates;
  }

  /**
   * 毎月繰り返しの日付配列を生成する。
   * 月末補正: 指定日が存在しない月（例: 2月31日）はその月の末日に補正する
   */
  private expandMonthly(
    baseDate: Date,
    interval: number,
    endDate: Date | null,
    maxCount: number,
  ): Date[] {
    const dates: Date[] = [];
    const baseDay = baseDate.getDate();

    let year = baseDate.getFullYear();
    let month = baseDate.getMonth();

    while (dates.length < maxCount) {
      // 月末補正: 指定した日付が当月に存在しない場合は月末日を使用する
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      const day = Math.min(baseDay, lastDayOfMonth);

      const candidate = new Date(
        year,
        month,
        day,
        baseDate.getHours(),
        baseDate.getMinutes(),
        baseDate.getSeconds(),
        0,
      );

      if (endDate && candidate > endDate) break;
      dates.push(candidate);

      month += interval;
      if (month > 11) {
        year += Math.floor(month / 12);
        month = month % 12;
      }
    }

    return dates;
  }

  /**
   * 指定日が属する週の日曜日（週の開始日）を返す
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * 予定を更新する。認可チェックは OwnershipGuard が担当する。
   * 存在しない場合は404例外をスローする
   */
  async update(id: number, dto: UpdateEventDto): Promise<EventResponseDto> {
    this.logger.log(CONTEXT, `予定更新開始: id=${id}`);

    const existing = await this.eventRepository.findById(id);
    if (!existing) {
      this.logger.warn(CONTEXT, `予定が見つかりません: id=${id}`);
      throw new NotFoundException(MESSAGE.EVENT.NOT_FOUND);
    }

    try {
      const event = await this.eventRepository.update(id, {
        title: dto.title,
        description: dto.description,
        start_at: dto.start_at ? new Date(dto.start_at) : undefined,
        end_at: dto.end_at ? new Date(dto.end_at) : undefined,
        color: dto.color,
      });
      this.logger.log(CONTEXT, `予定更新完了: id=${id}`);
      return this.toResponseDto(event);
    } catch (error) {
      this.logger.error(CONTEXT, `予定更新失敗: id=${id} - ${String(error)}`);
      throw new InternalServerErrorException(MESSAGE.EVENT.UPDATE_FAILED);
    }
  }

  /**
   * 繰り返しグループに属する全予定を一括更新する。
   * グループ内の全件の created_by が requestUsername と一致することを確認してから更新する。
   * title / description / color は全件に同じ値を適用する。
   * start_diff_ms / end_diff_ms が指定された場合は各予定の start_at / end_at にそれぞれ加算する
   */
  async updateRepeatGroup(
    repeatGroupId: string,
    dto: UpdateRepeatGroupEventDto,
    requestUsername: string,
  ): Promise<EventResponseDto[]> {
    this.logger.log(
      CONTEXT,
      `繰り返しグループ更新開始: groupId=${repeatGroupId}`,
    );

    const group = await this.eventRepository.findByRepeatGroupId(repeatGroupId);
    if (group.length === 0) {
      this.logger.warn(
        CONTEXT,
        `繰り返しグループが見つかりません: groupId=${repeatGroupId}`,
      );
      throw new NotFoundException(MESSAGE.EVENT.REPEAT_GROUP_NOT_FOUND);
    }

    // 全件の作成者が requestUsername と一致することを確認する
    const hasUnauthorized = group.some((e) => e.created_by !== requestUsername);
    if (hasUnauthorized) {
      this.logger.warn(
        CONTEXT,
        `繰り返しグループ更新権限なし: groupId=${repeatGroupId}, user=${requestUsername}`,
      );
      throw new ForbiddenException(MESSAGE.EVENT.REPEAT_GROUP_FORBIDDEN);
    }

    try {
      const updates = group.map((event) => {
        const newStartAt =
          dto.start_diff_ms !== undefined && dto.start_diff_ms !== 0
            ? new Date(event.start_at.getTime() + dto.start_diff_ms)
            : undefined;
        const newEndAt =
          dto.end_diff_ms !== undefined && dto.end_diff_ms !== 0
            ? new Date(event.end_at.getTime() + dto.end_diff_ms)
            : undefined;

        return {
          id: event.id,
          data: {
            ...(dto.title !== undefined && { title: dto.title }),
            ...(dto.description !== undefined && {
              description: dto.description,
            }),
            ...(newStartAt !== undefined && { start_at: newStartAt }),
            ...(newEndAt !== undefined && { end_at: newEndAt }),
            ...(dto.color !== undefined && { color: dto.color }),
          },
        };
      });

      const updatedEvents = await this.eventRepository.updateMany(updates);
      this.logger.log(
        CONTEXT,
        `繰り返しグループ更新完了: groupId=${repeatGroupId}, 件数=${updatedEvents.length}`,
      );
      return updatedEvents.map((e) => this.toResponseDto(e));
    } catch (error) {
      this.logger.error(
        CONTEXT,
        `繰り返しグループ更新失敗: groupId=${repeatGroupId} - ${String(error)}`,
      );
      throw new InternalServerErrorException(MESSAGE.EVENT.UPDATE_GROUP_FAILED);
    }
  }

  /**
   * 予定を削除する。認可チェックは OwnershipGuard が担当する。
   * 存在しない場合は404例外をスローする
   */
  async remove(id: number): Promise<void> {
    this.logger.log(CONTEXT, `予定削除開始: id=${id}`);

    const existing = await this.eventRepository.findById(id);
    if (!existing) {
      this.logger.warn(CONTEXT, `予定が見つかりません: id=${id}`);
      throw new NotFoundException(MESSAGE.EVENT.NOT_FOUND);
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
      color: event.color,
      repeat_group_id: event.repeat_group_id,
      created_by: event.created_by,
      created_at: event.created_at.toISOString(),
      updated_at: event.updated_at.toISOString(),
    };
  }
}
