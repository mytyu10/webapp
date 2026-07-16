import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from '../service/chat.service';
import { CreateChatMessageDto } from '../dto/chat.dto';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { HttpStatus } from 'src/common/type/status.enum';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';
import type { JwtPayload } from 'src/jwt/jwt.payload';

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
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, 'チャット相手一覧取得リクエスト');
    const contacts = await this.chatService.findContacts(currentUser.username);
    return response.status(HttpStatus.OK).json(contacts);
  }

  /**
   * 全ユーザー一覧取得エンドポイント（チャット相手選択用）
   */
  @Get('users')
  async findAllUsers(
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, '全ユーザー一覧取得リクエスト');
    const users = await this.chatService.findAllUsers(currentUser.username);
    return response.status(HttpStatus.OK).json(users);
  }

  /**
   * 2ユーザー間のメッセージ一覧取得エンドポイント
   * クエリパラメータ `with` に相手のユーザー名を指定する
   */
  @Get('messages')
  async findMessages(
    @Query('with') withUser: string | undefined,
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `メッセージ一覧取得リクエスト: with=${withUser}`);
    if (!withUser) {
      throw new BadRequestException('クエリパラメータ with は必須です');
    }
    const messages = await this.chatService.findConversation(
      currentUser.username,
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
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `メッセージ送信リクエスト: to=${dto.to_user}`);
    const message = await this.chatService.sendMessage(
      currentUser.username,
      dto,
    );
    return response
      .status(HttpStatus.CREATED)
      .json({ message: MESSAGE.CHAT.SEND_SUCCESS, data: message });
  }
}
