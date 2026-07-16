import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Request } from 'express';
import { MESSAGE } from 'src/common/type/message';
import type { JwtPayload } from 'src/jwt/jwt.payload';

/**
 * JwtAuthGuard によってセットされた認証済みユーザー情報を取得するデコレーター
 * request.user が存在しない場合は InternalServerErrorException をスローする
 * @example
 *   async findAll(@CurrentUser() currentUser: JwtPayload) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.user) {
      throw new InternalServerErrorException(MESSAGE.AUTH.AUTH_INFO_FAILED);
    }
    return request.user;
  },
);
