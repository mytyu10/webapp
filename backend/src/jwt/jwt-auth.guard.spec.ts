import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import jwt from 'jsonwebtoken';

/** ExecutionContextのモックを生成するヘルパー */
function createMockContext(authHeader?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: authHeader ? { authorization: authHeader } : {},
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  const secret = 'test-secret';

  beforeEach(() => {
    guard = new JwtAuthGuard();
    process.env.JWT_SECRET = secret;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('有効なBearerトークンの場合はtrueを返す', () => {
    const token = jwt.sign({ username: 'testuser' }, secret, {
      expiresIn: '1h',
    });
    const context = createMockContext(`Bearer ${token}`);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('Authorizationヘッダーが存在しない場合はUnauthorizedExceptionをスローする', () => {
    const context = createMockContext();

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('Bearer形式でない場合はUnauthorizedExceptionをスローする', () => {
    const context = createMockContext('Basic dXNlcjpwYXNz');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('無効なトークンの場合はUnauthorizedExceptionをスローする', () => {
    const context = createMockContext('Bearer invalid.token.here');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('期限切れトークンの場合はUnauthorizedExceptionをスローする', () => {
    const token = jwt.sign({ username: 'testuser' }, secret, {
      expiresIn: '0s',
    });
    const context = createMockContext(`Bearer ${token}`);

    /** 期限切れになるまで1ms待機 */
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
        resolve();
      }, 10);
    });
  });
});
