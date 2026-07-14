import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ChatService } from '../service/chat.service';
import { WsJwtGuard } from './ws-jwt.guard';
import type { JwtPayload } from 'src/jwt/jwt.payload';
import { LoggerService } from 'src/common/service/logger.service';
import { MESSAGE } from 'src/common/type/message';

const CONTEXT = 'ChatGateway';

/** メッセージ送信イベントのペイロード型 */
interface SendMessagePayload {
  to_user: string;
  content: string;
}

/** client.data から JwtPayload を安全に取得するヘルパー */
function getUserFromClient(client: Socket): JwtPayload | undefined {
  const data = client.data as Record<string, unknown>;
  const user = data['user'];
  if (user && typeof (user as JwtPayload).username === 'string') {
    return user as JwtPayload;
  }
  return undefined;
}

/**
 * チャット WebSocket Gateway
 * - namespace: /chat
 * - 接続時にJWT検証を行い、無効なら切断する
 * - 各ユーザーは自分のルーム user:<username> に参加する
 * - メッセージ送信時は送受信者両方のルームに receive_message をemitする
 */
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: false,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * WebSocket 接続時のハンドラ
   * JWT を検証し、無効なら接続を切断する
   * 検証成功時はユーザー自身のルームに参加する
   */
  handleConnection(client: Socket): void {
    const auth = client.handshake.auth as Record<string, string>;
    const token =
      auth['token'] || (client.handshake.query['token'] as string | undefined);

    if (!token) {
      this.logger.warn(
        CONTEXT,
        `接続拒否: トークンなし (socketId=${client.id})`,
      );
      client.disconnect();
      return;
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      const data = client.data as Record<string, unknown>;
      data['user'] = payload;
      const room = `user:${payload.username}`;
      void client.join(room);
      this.logger.log(
        CONTEXT,
        `接続成功: user=${payload.username}, socketId=${client.id}, room=${room}`,
      );
    } catch {
      this.logger.warn(CONTEXT, `接続拒否: JWTが無効 (socketId=${client.id})`);
      client.disconnect();
    }
  }

  /**
   * WebSocket 切断時のハンドラ
   */
  handleDisconnect(client: Socket): void {
    const user = getUserFromClient(client);
    this.logger.log(
      CONTEXT,
      `切断: user=${user?.username ?? '不明'}, socketId=${client.id}`,
    );
  }

  /**
   * メッセージ送信イベントハンドラ
   * DBに保存し、送信者・受信者両方のルームに receive_message をemitする
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessagePayload,
  ): Promise<void> {
    const user = getUserFromClient(client);
    if (!user) {
      throw new WsException(MESSAGE.AUTH.UNAUTHORIZED);
    }

    this.logger.log(
      CONTEXT,
      `send_message受信: from=${user.username}, to=${payload.to_user}`,
    );

    const message = await this.chatService.sendMessage(user.username, {
      to_user: payload.to_user,
      content: payload.content,
    });

    const senderRoom = `user:${user.username}`;
    const receiverRoom = `user:${payload.to_user}`;

    this.logger.log(
      CONTEXT,
      `receive_message emit: rooms=[${senderRoom}, ${receiverRoom}]`,
    );

    // 送信者・受信者両方のルームにemitする
    this.server
      .to(senderRoom)
      .to(receiverRoom)
      .emit('receive_message', message);
  }
}
