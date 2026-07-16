import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { EventService } from '../service/event.service';
import {
  CreateEventDto,
  CreateMultipleEventsDto,
  CreateRepeatEventDto,
  UpdateEventDto,
  UpdateRepeatGroupEventDto,
} from '../dto/event.dto';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { OwnershipGuard } from 'src/common/guards/ownership.guard';
import { CheckOwnership } from 'src/common/decorators/check-ownership.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { HttpStatus } from 'src/common/type/status.enum';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';
import type { JwtPayload } from 'src/jwt/jwt.payload';

const CONTEXT = 'EventController';

/**
 * 予定管理コントローラー
 * 全エンドポイントにJwtAuthGuardを適用する
 */
@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventController {
  constructor(
    private readonly eventService: EventService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 予定一覧取得エンドポイント
   * ログインユーザーが作成者である予定のみ返す
   */
  @Get()
  async findAll(
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, '予定一覧取得リクエスト');
    const events = await this.eventService.findAll(currentUser.username);
    return response.status(HttpStatus.OK).json(events);
  }

  /**
   * 予定詳細取得エンドポイント
   * 作成者のみアクセス可能（OwnershipGuard）
   */
  @Get(':id')
  @CheckOwnership('event')
  @UseGuards(OwnershipGuard)
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `予定詳細取得リクエスト: id=${id}`);
    const event = await this.eventService.findById(id);
    return response.status(HttpStatus.OK).json(event);
  }

  /**
   * 予定作成エンドポイント。作成者はJWT認証済みユーザー名を使用する
   */
  @Post()
  async create(
    @Body() dto: CreateEventDto,
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `予定作成リクエスト: ${dto.title}`);
    const event = await this.eventService.create(dto, currentUser.username);
    return response
      .status(HttpStatus.CREATED)
      .json({ message: MESSAGE.EVENT.CREATE_SUCCESS, event });
  }

  /**
   * 複数日付一括作成エンドポイント。
   * 固定パスルートのため :id より前に定義する
   */
  @Post('multiple')
  async createMultiple(
    @Body() dto: CreateMultipleEventsDto,
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `複数予定作成リクエスト: ${dto.title}`);
    const events = await this.eventService.createMultiple(
      dto,
      currentUser.username,
    );
    return response
      .status(HttpStatus.CREATED)
      .json({ message: MESSAGE.EVENT.CREATE_SUCCESS, events });
  }

  /**
   * 繰り返し予定一括作成エンドポイント。
   * 固定パスルートのため :id より前に定義する
   */
  @Post('repeat')
  async createRepeat(
    @Body() dto: CreateRepeatEventDto,
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `繰り返し予定作成リクエスト: ${dto.title}`);
    const events = await this.eventService.createRepeat(
      dto,
      currentUser.username,
    );
    return response
      .status(HttpStatus.CREATED)
      .json({ message: MESSAGE.EVENT.CREATE_SUCCESS, events });
  }

  /**
   * 繰り返しグループ全件更新エンドポイント（作成者のみ）。
   * 固定パスルートのため :id より前に定義する。
   * グループ全件の created_by チェックはサービス層で行う
   */
  @Patch('repeat-group/:groupId')
  async updateRepeatGroup(
    @Param('groupId') groupId: string,
    @Body() dto: UpdateRepeatGroupEventDto,
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(
      CONTEXT,
      `繰り返しグループ更新リクエスト: groupId=${groupId}`,
    );
    const events = await this.eventService.updateRepeatGroup(
      groupId,
      dto,
      currentUser.username,
    );
    return response
      .status(HttpStatus.OK)
      .json({ message: MESSAGE.EVENT.UPDATE_GROUP_SUCCESS, events });
  }

  /**
   * 予定更新エンドポイント（作成者のみ、OwnershipGuard で認可）
   */
  @Patch(':id')
  @CheckOwnership('event')
  @UseGuards(OwnershipGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEventDto,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `予定更新リクエスト: id=${id}`);
    const event = await this.eventService.update(id, dto);
    return response
      .status(HttpStatus.OK)
      .json({ message: MESSAGE.EVENT.UPDATE_SUCCESS, event });
  }

  /**
   * 予定削除エンドポイント（作成者のみ、OwnershipGuard で認可）
   */
  @Delete(':id')
  @CheckOwnership('event')
  @UseGuards(OwnershipGuard)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `予定削除リクエスト: id=${id}`);
    await this.eventService.remove(id);
    return response
      .status(HttpStatus.OK)
      .json({ message: MESSAGE.EVENT.DELETE_SUCCESS });
  }
}
