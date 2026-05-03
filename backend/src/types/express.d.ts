import type { JwtPayload } from 'src/jwt/jwt.payload';

declare global {
  namespace Express {
    interface Request {
      /** JWTAuthGuardによってセットされた認証済みユーザー情報 */
      user?: JwtPayload;
    }
  }
}
