import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import type { JwtPayload } from 'src/jwt/jwt.payload';
import { MESSAGE } from 'src/common/type/message';

/**
 * WebSocket 用 JWT 認証ガード
 * client.handshake.auth.token または client.handshake.query.token からJWTを検証する
 * 検証成功時は client.data.user に JwtPayload をセットする
 */
@Injectable()
export class WsJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const auth = client.handshake.auth as Record<string, string>;
    const token =
      auth['token'] || (client.handshake.query['token'] as string | undefined);

    if (!token) {
      throw new WsException(MESSAGE.AUTH.UNAUTHORIZED);
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      const data = client.data as Record<string, unknown>;
      data['user'] = payload;
      return true;
    } catch {
      throw new WsException(MESSAGE.AUTH.UNAUTHORIZED);
    }
  }
}
