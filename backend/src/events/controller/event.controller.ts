import {
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { EventService } from '../service/event.service';
import {
  CreateEventDto,
  CreateMultipleEventsDto,
  CreateRepeatEventDto,
  UpdateEventDto,
} from '../dto/event.dto';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { HttpStatus } from 'src/common/type/status.enum';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';

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
   */
  @Get()
  async findAll(@Res() response: Response): Promise<Response> {
    this.logger.log(CONTEXT, '予定一覧取得リクエスト');
    const events = await this.eventService.findAll();
    return response.status(HttpStatus.OK).json(events);
  }

  /**
   * 予定詳細取得エンドポイント
   */
  @Get(':id')
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
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `予定作成リクエスト: ${dto.title}`);
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    const event = await this.eventService.create(dto, requestUser.username);
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
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `複数予定作成リクエスト: ${dto.title}`);
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    const events = await this.eventService.createMultiple(
      dto,
      requestUser.username,
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
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `繰り返し予定作成リクエスト: ${dto.title}`);
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    const events = await this.eventService.createRepeat(
      dto,
      requestUser.username,
    );
    return response
      .status(HttpStatus.CREATED)
      .json({ message: MESSAGE.EVENT.CREATE_SUCCESS, events });
  }

  /**
   * 予定更新エンドポイント（作成者のみ）
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEventDto,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `予定更新リクエスト: id=${id}`);
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    const event = await this.eventService.update(id, dto, requestUser.username);
    return response
      .status(HttpStatus.OK)
      .json({ message: MESSAGE.EVENT.UPDATE_SUCCESS, event });
  }

  /**
   * 予定削除エンドポイント（作成者のみ）
   */
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `予定削除リクエスト: id=${id}`);
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    await this.eventService.remove(id, requestUser.username);
    return response
      .status(HttpStatus.OK)
      .json({ message: MESSAGE.EVENT.DELETE_SUCCESS });
  }
}
