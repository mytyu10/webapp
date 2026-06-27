import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountRepository } from '../repository/account.repository';
import { HashService } from 'src/common/service/hash.service';
import { JwtService } from 'src/jwt/jwt.service';
import { LoggerService } from 'src/common/service/logger.service';
import { MESSAGE } from 'src/common/type/message';

/** モック用アカウントデータ */
const mockAccount = {
  username: 'testuser',
  hashed_password: 'hashed_pass',
  line_user_id: null,
};

const mockAccountRepository = {
  getAccount: jest.fn(),
  createUser: jest.fn(),
  updateLineUserId: jest.fn(),
};

const mockHashService = {
  createHash: jest.fn().mockReturnValue('hashed_pass'),
};

const mockJwtService = {
  createToken: jest.fn().mockReturnValue('mock_token'),
};

const mockLoggerService = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('AccountService', () => {
  let service: AccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        { provide: AccountRepository, useValue: mockAccountRepository },
        { provide: HashService, useValue: mockHashService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<AccountService>(AccountService);
    jest.clearAllMocks();
    mockHashService.createHash.mockReturnValue('hashed_pass');
    mockJwtService.createToken.mockReturnValue('mock_token');
  });

  describe('login', () => {
    it('正しいパスワードでログインするとJWTトークンを返す', async () => {
      mockAccountRepository.getAccount.mockResolvedValue(mockAccount);

      const result = await service.login({
        username: 'testuser',
        password: 'pass',
      });

      expect(result).toBe('mock_token');
    });

    it('存在しないユーザーの場合は null を返す', async () => {
      mockAccountRepository.getAccount.mockResolvedValue(null);

      const result = await service.login({
        username: 'nonexist',
        password: 'pass',
      });

      expect(result).toBeNull();
    });

    it('パスワードが一致しない場合は null を返す', async () => {
      mockHashService.createHash.mockReturnValue('wrong_hash');
      mockAccountRepository.getAccount.mockResolvedValue(mockAccount);

      const result = await service.login({
        username: 'testuser',
        password: 'wrong',
      });

      expect(result).toBeNull();
    });
  });

  describe('regist', () => {
    it('新規ユーザー登録が成功すると "success" を返す', async () => {
      mockAccountRepository.getAccount.mockResolvedValue(null);
      mockAccountRepository.createUser.mockResolvedValue(mockAccount);

      const result = await service.regist({
        username: 'newuser',
        password: 'pass',
      });

      expect(result).toBe('success');
    });

    it('ユーザー名が重複している場合は "duplicate" を返す', async () => {
      mockAccountRepository.getAccount.mockResolvedValue(mockAccount);

      const result = await service.regist({
        username: 'testuser',
        password: 'pass',
      });

      expect(result).toBe('duplicate');
    });

    it('DB書き込みエラー時は InternalServerErrorException をスローする', async () => {
      mockAccountRepository.getAccount.mockResolvedValue(null);
      mockAccountRepository.createUser.mockRejectedValue(new Error('DB error'));

      await expect(
        service.regist({ username: 'newuser', password: 'pass' }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getLineLoginUrl', () => {
    it('LINE認証URLを返す', () => {
      process.env.LINE_LOGIN_CHANNEL_ID = '12345';

      const url = service.getLineLoginUrl();

      expect(url).toContain('https://access.line.me/oauth2/v2.1/authorize');
      expect(url).toContain('response_type=code');
      expect(url).toContain('client_id=12345');
      expect(url).toContain('scope=profile');
    });
  });

  describe('getMe', () => {
    it('ログインユーザー情報を返す（LINE未連携）', async () => {
      mockAccountRepository.getAccount.mockResolvedValue(mockAccount);

      const result = await service.getMe('testuser');

      expect(result.username).toBe('testuser');
      expect(result.line_user_id).toBeNull();
    });

    it('ログインユーザー情報を返す（LINE連携済み）', async () => {
      const linkedAccount = { ...mockAccount, line_user_id: 'U123456789' };
      mockAccountRepository.getAccount.mockResolvedValue(linkedAccount);

      const result = await service.getMe('testuser');

      expect(result.username).toBe('testuser');
      expect(result.line_user_id).toBe('U123456789');
    });

    it('アカウントが見つからない場合は InternalServerErrorException をスローする', async () => {
      mockAccountRepository.getAccount.mockResolvedValue(null);

      await expect(service.getMe('nonexist')).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.getMe('nonexist')).rejects.toThrow(
        MESSAGE.AUTH.ME_FETCH_FAILED,
      );
    });
  });
});
