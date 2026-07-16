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
import { LinkService } from '../service/link.service';
import { LinkPermissionService } from '../service/link-permission.service';
import { CreateLinkItemDto, UpdateLinkItemDto } from '../dto/link.dto';
import { CreatePermissionDto } from 'src/permissions/permission.dto';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { OwnershipGuard } from 'src/common/guards/ownership.guard';
import { CheckOwnership } from 'src/common/decorators/check-ownership.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { HttpStatus } from 'src/common/type/status.enum';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';
import type { JwtPayload } from 'src/jwt/jwt.payload';

const CONTEXT = 'LinkController';

/**
 * リンク集コントローラー
 * 全エンドポイントに JwtAuthGuard を適用する
 */
@Controller('links')
@UseGuards(JwtAuthGuard)
export class LinkController {
  constructor(
    private readonly linkService: LinkService,
    private readonly linkPermissionService: LinkPermissionService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * リンク/フォルダ一覧取得エンドポイント（ツリー構造で返す）
   * ログインユーザーが作成者・権限付与済みであるリンク/フォルダのみ返す
   */
  @Get()
  async findAll(
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, 'リンク一覧取得リクエスト');
    const links = await this.linkService.findAll(currentUser.username);
    return response.status(HttpStatus.OK).json(links);
  }

  /**
   * リンク/フォルダ作成エンドポイント
   */
  @Post()
  async create(
    @Body() dto: CreateLinkItemDto,
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `リンク作成リクエスト: ${dto.title}`);
    const link = await this.linkService.create(dto, currentUser.username);
    return response
      .status(HttpStatus.CREATED)
      .json({ message: MESSAGE.LINK.CREATE_SUCCESS, link });
  }

  /**
   * リンク/フォルダ更新エンドポイント
   * 作成者・WRITE権限保持者のみ操作可能（OwnershipGuard）
   */
  @Patch(':id')
  @CheckOwnership('link')
  @UseGuards(OwnershipGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLinkItemDto,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `リンク更新リクエスト: id=${id}`);
    const link = await this.linkService.update(id, dto);
    return response
      .status(HttpStatus.OK)
      .json({ message: MESSAGE.LINK.UPDATE_SUCCESS, link });
  }

  /**
   * リンク/フォルダ削除エンドポイント
   * 作成者・WRITE権限保持者のみ操作可能（OwnershipGuard）
   */
  @Delete(':id')
  @CheckOwnership('link')
  @UseGuards(OwnershipGuard)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `リンク削除リクエスト: id=${id}`);
    await this.linkService.delete(id, currentUser.username);
    return response
      .status(HttpStatus.OK)
      .json({ message: MESSAGE.LINK.DELETE_SUCCESS });
  }

  /**
   * リンク権限一覧取得エンドポイント（作成者のみ）
   */
  @Get(':id/permissions')
  async getPermissions(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `リンク権限一覧取得リクエスト: linkItemId=${id}`);
    const permissions = await this.linkPermissionService.findAll(
      id,
      currentUser.username,
    );
    return response.status(HttpStatus.OK).json(permissions);
  }

  /**
   * リンク権限付与エンドポイント（作成者のみ）
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
      `リンク権限付与リクエスト: linkItemId=${id}, target=${dto.username}`,
    );
    const permission = await this.linkPermissionService.add(
      id,
      dto,
      currentUser.username,
    );
    return response
      .status(HttpStatus.CREATED)
      .json({ message: MESSAGE.PERMISSION.ADD_SUCCESS, permission });
  }

  /**
   * リンク権限削除エンドポイント（作成者のみ）
   */
  @Delete(':id/permissions/:username')
  async removePermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('username') targetUsername: string,
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(
      CONTEXT,
      `リンク権限削除リクエスト: linkItemId=${id}, target=${targetUsername}`,
    );
    await this.linkPermissionService.remove(
      id,
      targetUsername,
      currentUser.username,
    );
    return response
      .status(HttpStatus.OK)
      .json({ message: MESSAGE.PERMISSION.REMOVE_SUCCESS });
  }
}
