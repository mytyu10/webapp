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
import { LinkService } from '../service/link.service';
import { CreateLinkItemDto, UpdateLinkItemDto } from '../dto/link.dto';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { HttpStatus } from 'src/common/type/status.enum';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';

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
    private readonly logger: LoggerService,
  ) {}

  /**
   * リンク/フォルダ一覧取得エンドポイント（ツリー構造で返す）
   * ログインユーザーが作成者であるリンク/フォルダのみ返す
   */
  @Get()
  async findAll(
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, 'リンク一覧取得リクエスト');
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    const links = await this.linkService.findAll(requestUser.username);
    return response.status(HttpStatus.OK).json(links);
  }

  /**
   * リンク/フォルダ作成エンドポイント
   */
  @Post()
  async create(
    @Body() dto: CreateLinkItemDto,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `リンク作成リクエスト: ${dto.title}`);
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    const link = await this.linkService.create(dto, requestUser.username);
    return response
      .status(HttpStatus.CREATED)
      .json({ message: MESSAGE.LINK.CREATE_SUCCESS, link });
  }

  /**
   * リンク/フォルダ更新エンドポイント
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLinkItemDto,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `リンク更新リクエスト: id=${id}`);
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    const link = await this.linkService.update(id, dto);
    return response
      .status(HttpStatus.OK)
      .json({ message: MESSAGE.LINK.UPDATE_SUCCESS, link });
  }

  /**
   * リンク/フォルダ削除エンドポイント（作成者のみ削除可能）
   */
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `リンク削除リクエスト: id=${id}`);
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    await this.linkService.delete(id, requestUser.username);
    return response
      .status(HttpStatus.OK)
      .json({ message: MESSAGE.LINK.DELETE_SUCCESS });
  }
}
