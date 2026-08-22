import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from './jwt.service';

/** jsonwebtoken モック（jest.mock は hoisting されるため変数を使わない） */
jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
  },
}));

import jwt from 'jsonwebtoken';

describe('JwtService', () => {
  let service: JwtService;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtService],
    }).compile();

    service = module.get<JwtService>(JwtService);
    jest.clearAllMocks();
    (jwt.sign as jest.Mock).mockReturnValue('mock.jwt.token');
  });

  describe('createToken', () => {
    it('jwt.sign をペイロードと JWT_SECRET で呼び出してトークンを返す', () => {
      const payload = { username: 'testuser' };

      const result = service.createToken(payload);

      expect(jwt.sign).toHaveBeenCalledWith(
        payload,
        'test-secret',
        expect.objectContaining({ expiresIn: '1h' }),
      );
      expect(result).toBe('mock.jwt.token');
    });

    it('返り値はトークン文字列である', () => {
      (jwt.sign as jest.Mock).mockReturnValue('another.jwt.token');
      const payload = { username: 'anotheruser' };

      const result = service.createToken(payload);

      expect(typeof result).toBe('string');
      expect(result).toBe('another.jwt.token');
    });
  });
});
