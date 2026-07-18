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
import { EventPermissionService } from '../service/event-permission.service';
import { EventProxyGrantService } from '../service/event-proxy-grant.service';
import {
  CreateEventDto,
  CreateMultipleEventsDto,
  CreateRepeatEventDto,
  UpdateEventDto,
  UpdateRepeatGroupEventDto,
  CreateProxyGrantDto,
} from '../dto/event.dto';
import { CreatePermissionDto } from 'src/permissions/permission.dto';
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
    private readonly eventPermissionService: EventPermissionService,
    private readonly eventProxyGrantService: EventProxyGrantService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 予定一覧取得エンドポイント
   * ログインユーザーが作成者または権限付与済みである予定のみ返す
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
   * 代理登録可能なユーザー一覧取得エンドポイント（自分が代理登録できるユーザー）。
   * 固定パスルートのため :id より前に定義する
   */
  @Get('proxy-grants/granters')
  async getProxyGranters(
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, '代理登録可能ユーザー一覧取得リクエスト');
    const granters = await this.eventProxyGrantService.findGranters(
      currentUser.username,
    );
    return response.status(HttpStatus.OK).json(granters);
  }

  /**
   * 自分が代理登録を許可しているユーザー一覧取得エンドポイント。
   * 固定パスルートのため :id より前に定義する
   */
  @Get('proxy-grants/grantees')
  async getProxyGrantees(
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, '代理登録許可ユーザー一覧取得リクエスト');
    const grantees = await this.eventProxyGrantService.findGrantees(
      currentUser.username,
    );
    return response.status(HttpStatus.OK).json(grantees);
  }

  /**
   * 代理登録権限付与エンドポイント（自分の予定への代理登録を許可する）。
   * 固定パスルートのため :id より前に定義する
   */
  @Post('proxy-grants')
  async addProxyGrant(
    @Body() dto: CreateProxyGrantDto,
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(
      CONTEXT,
      `代理登録権限付与リクエスト: grantee=${dto.grantee_username}`,
    );
    const grant = await this.eventProxyGrantService.add(
      currentUser.username,
      dto.grantee_username,
    );
    return response
      .status(HttpStatus.CREATED)
      .json({ message: MESSAGE.EVENT.PROXY_GRANT_ADD_SUCCESS, grant });
  }

  /**
   * 代理登録権限削除エンドポイント。
   * 固定パスルートのため :id より前に定義する
   */
  @Delete('proxy-grants/:granteeUsername')
  async removeProxyGrant(
    @Param('granteeUsername') granteeUsername: string,
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(
      CONTEXT,
      `代理登録権限削除リクエスト: grantee=${granteeUsername}`,
    );
    await this.eventProxyGrantService.remove(
      currentUser.username,
      granteeUsername,
    );
    return response
      .status(HttpStatus.OK)
      .json({ message: MESSAGE.EVENT.PROXY_GRANT_REMOVE_SUCCESS });
  }

  /**
   * 予定詳細取得エンドポイント
   * 作成者・権限保持者（READ/WRITE）のみアクセス可能（OwnershipGuard）
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
   * 予定作成エンドポイント。
   * created_by が未指定の場合はJWT認証済みユーザー名を使用する。
   * created_by が指定された場合は代理登録として扱い、EventProxyGrant権限を確認する
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
   * 予定更新エンドポイント（作成者・WRITE権限保持者、OwnershipGuard で認可）
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
   * 予定削除エンドポイント（作成者・WRITE権限保持者、OwnershipGuard で認可）
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

  /**
   * 予定の権限一覧取得エンドポイント（作成者のみ）
   */
  @Get(':id/permissions')
  async getPermissions(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `予定権限一覧取得リクエスト: id=${id}`);
    const permissions = await this.eventPermissionService.findAll(
      id,
      currentUser.username,
    );
    return response.status(HttpStatus.OK).json(permissions);
  }

  /**
   * 予定への権限付与エンドポイント（作成者のみ）
   */
  @Post(':id/permissions')
  async addPermission(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePermissionDto,
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(
      CONTEXT,
      `予定権限付与リクエスト: id=${id}, target=${dto.username}`,
    );
    const permission = await this.eventPermissionService.add(
      id,
      dto,
      currentUser.username,
    );
    return response
      .status(HttpStatus.CREATED)
      .json({ message: MESSAGE.EVENT.PERMISSION_ADD_SUCCESS, permission });
  }

  /**
   * 予定の権限削除エンドポイント（作成者のみ）
   */
  @Delete(':id/permissions/:username')
  async removePermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('username') username: string,
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(
      CONTEXT,
      `予定権限削除リクエスト: id=${id}, target=${username}`,
    );
    await this.eventPermissionService.remove(id, username, currentUser.username);
    return response
      .status(HttpStatus.OK)
      .json({ message: MESSAGE.EVENT.PERMISSION_REMOVE_SUCCESS });
  }
}
