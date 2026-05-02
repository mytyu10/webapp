import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';
import { MESSAGE } from 'src/common/type/message';

/**
 * JWT認証ガード
 * AuthorizationヘッダーのBearerトークンを検証し、無効・未存在の場合は401を返す
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  /**
   * リクエストのJWTトークンを検証する
   * 検証成功時はtrueを返し、失敗時はUnauthorizedExceptionをスローする
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(MESSAGE.AUTH.UNAUTHORIZED);
    }

    const token = authHeader.slice('Bearer '.length);

    try {
      jwt.verify(token, process.env.JWT_SECRET!);
      return true;
    } catch {
      throw new UnauthorizedException(MESSAGE.AUTH.UNAUTHORIZED);
    }
  }
}
