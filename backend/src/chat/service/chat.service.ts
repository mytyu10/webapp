import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ChatRepository } from '../repository/chat.repository';
import { AccountRepository } from 'src/accounts/repository/account.repository';
import {
  CreateChatMessageDto,
  ChatMessageResponseDto,
  ChatContactResponseDto,
} from '../dto/chat.dto';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';

const CONTEXT = 'ChatService';

@Injectable()
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly accountRepository: AccountRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * 2ユーザー間のメッセージ一覧を取得する
   */
  async findConversation(
    currentUser: string,
    withUser: string,
  ): Promise<ChatMessageResponseDto[]> {
    this.logger.log(
      CONTEXT,
      `会話取得開始: currentUser=${currentUser}, withUser=${withUser}`,
    );
    try {
      const messages = await this.chatRepository.findConversation(
        currentUser,
        withUser,
      );
      return messages.map((m) => ({
        id: m.id,
        from_user: m.from_user,
        to_user: m.to_user,
        content: m.content,
        created_at: m.created_at.toISOString(),
      }));
    } catch (err: unknown) {
      this.logger.error(CONTEXT, `会話取得失敗: ${String(err)}`);
      throw new InternalServerErrorException(MESSAGE.CHAT.FETCH_FAILED);
    }
  }

  /**
   * メッセージを送信する
   */
  async sendMessage(
    fromUser: string,
    dto: CreateChatMessageDto,
  ): Promise<ChatMessageResponseDto> {
    this.logger.log(
      CONTEXT,
      `メッセージ送信開始: from=${fromUser}, to=${dto.to_user}`,
    );
    try {
      const message = await this.chatRepository.create({
        from_user: fromUser,
        to_user: dto.to_user,
        content: dto.content,
      });
      this.logger.log(CONTEXT, `メッセージ送信完了: id=${message.id}`);
      return {
        id: message.id,
        from_user: message.from_user,
        to_user: message.to_user,
        content: message.content,
        created_at: message.created_at.toISOString(),
      };
    } catch (err: unknown) {
      this.logger.error(CONTEXT, `メッセージ送信失敗: ${String(err)}`);
      throw new InternalServerErrorException(MESSAGE.CHAT.SEND_FAILED);
    }
  }

  /**
   * やり取りしたことのある相手ユーザー一覧を取得する
   */
  async findContacts(username: string): Promise<ChatContactResponseDto[]> {
    this.logger.log(CONTEXT, `チャット相手一覧取得開始: user=${username}`);
    try {
      const contacts = await this.chatRepository.findContacts(username);
      return contacts.map((c) => ({ username: c }));
    } catch (err: unknown) {
      this.logger.error(CONTEXT, `チャット相手一覧取得失敗: ${String(err)}`);
      throw new InternalServerErrorException(MESSAGE.CHAT.CONTACTS_FETCH_FAILED);
    }
  }

  /**
   * 全ユーザー一覧を取得する（チャット相手選択用）
   */
  async findAllUsers(
    currentUser: string,
  ): Promise<ChatContactResponseDto[]> {
    this.logger.log(CONTEXT, `全ユーザー一覧取得開始: currentUser=${currentUser}`);
    try {
      const accounts = await this.accountRepository.findAll();
      return accounts
        .filter((a) => a.username !== currentUser)
        .map((a) => ({ username: a.username }));
    } catch (err: unknown) {
      this.logger.error(CONTEXT, `全ユーザー一覧取得失敗: ${String(err)}`);
      throw new InternalServerErrorException(MESSAGE.CHAT.USERS_FETCH_FAILED);
    }
  }
}
