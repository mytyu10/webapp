import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ChatService } from '../service/chat.service';
import { CreateChatMessageDto } from '../dto/chat.dto';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { HttpStatus } from 'src/common/type/status.enum';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';

const CONTEXT = 'ChatController';

/**
 * チャットコントローラー
 * 全エンドポイントに JwtAuthGuard を適用する
 */
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * やり取りしたことのある相手ユーザー一覧取得エンドポイント
   */
  @Get('contacts')
  async findContacts(
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, 'チャット相手一覧取得リクエスト');
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    const contacts = await this.chatService.findContacts(requestUser.username);
    return response.status(HttpStatus.OK).json(contacts);
  }

  /**
   * 全ユーザー一覧取得エンドポイント（チャット相手選択用）
   */
  @Get('users')
  async findAllUsers(
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, '全ユーザー一覧取得リクエスト');
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    const users = await this.chatService.findAllUsers(requestUser.username);
    return response.status(HttpStatus.OK).json(users);
  }

  /**
   * 2ユーザー間のメッセージ一覧取得エンドポイント
   * クエリパラメータ `with` に相手のユーザー名を指定する
   */
  @Get('messages')
  async findMessages(
    @Query('with') withUser: string,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `メッセージ一覧取得リクエスト: with=${withUser}`);
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    const messages = await this.chatService.findConversation(
      requestUser.username,
      withUser,
    );
    return response.status(HttpStatus.OK).json(messages);
  }

  /**
   * メッセージ送信エンドポイント
   */
  @Post('messages')
  async sendMessage(
    @Body() dto: CreateChatMessageDto,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `メッセージ送信リクエスト: to=${dto.to_user}`);
    const requestUser = req.user;
    if (!requestUser) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    const message = await this.chatService.sendMessage(
      requestUser.username,
      dto,
    );
    return response
      .status(HttpStatus.CREATED)
      .json({ message: MESSAGE.CHAT.SEND_SUCCESS, data: message });
  }
}
