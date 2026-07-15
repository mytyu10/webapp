import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountRepository } from '../repository/account.repository';
import { HashService } from 'src/common/service/hash.service';
import { JwtService } from 'src/jwt/jwt.service';
import { LoggerService } from 'src/common/service/logger.service';
import { MESSAGE } from 'src/common/type/message';

/** モック用アカウントデータ（bcryptハッシュ済みの例） */
const mockAccount = {
  username: 'testuser',
  hashed_password: '$2b$10$mockedhashvalue',
  line_user_id: null,
};

const mockAccountRepository = {
  getAccount: jest.fn(),
  createUser: jest.fn(),
  updateLineUserId: jest.fn(),
  updateHashedPassword: jest.fn(),
};

/**
 * HashService のモック
 * - createHash: bcrypt ハッシュを返す（async）
 * - compareHash: bcrypt 照合結果を返す（async）
 * - isLegacySha256: SHA-256 フォールバック照合（sync）
 */
const mockHashService = {
  createHash: jest.fn().mockResolvedValue('$2b$10$mockedhashvalue'),
  compareHash: jest.fn().mockResolvedValue(false),
  isLegacySha256: jest.fn().mockReturnValue(false),
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
    mockHashService.createHash.mockResolvedValue('$2b$10$mockedhashvalue');
    mockHashService.compareHash.mockResolvedValue(false);
    mockHashService.isLegacySha256.mockReturnValue(false);
    mockJwtService.createToken.mockReturnValue('mock_token');
    mockAccountRepository.updateHashedPassword.mockResolvedValue(mockAccount);
  });

  describe('login', () => {
    it('bcrypt照合が成功するとJWTトークンを返す', async () => {
      mockAccountRepository.getAccount.mockResolvedValue(mockAccount);
      // bcrypt 照合成功
      mockHashService.compareHash.mockResolvedValue(true);

      const result = await service.login({
        username: 'testuser',
        password: 'correctpassword',
      });

      expect(result).toBe('mock_token');
      expect(mockHashService.compareHash).toHaveBeenCalledWith(
        'correctpassword',
        mockAccount.hashed_password,
      );
    });

    it('SHA-256フォールバックが一致する場合、bcrypt再ハッシュしてJWTを返す', async () => {
      mockAccountRepository.getAccount.mockResolvedValue(mockAccount);
      // bcrypt 照合失敗 → SHA-256 フォールバック成功
      mockHashService.compareHash.mockResolvedValue(false);
      mockHashService.isLegacySha256.mockReturnValue(true);

      const result = await service.login({
        username: 'testuser',
        password: 'legacypassword',
      });

      expect(result).toBe('mock_token');
      // 再ハッシュして DB 更新する
      expect(mockHashService.createHash).toHaveBeenCalledWith('legacypassword');
      expect(mockAccountRepository.updateHashedPassword).toHaveBeenCalled();
    });

    it('存在しないユーザーの場合は null を返す', async () => {
      mockAccountRepository.getAccount.mockResolvedValue(null);

      const result = await service.login({
        username: 'nonexist',
        password: 'pass',
      });

      expect(result).toBeNull();
    });

    it('bcryptもSHA-256も一致しない場合は null を返す', async () => {
      mockAccountRepository.getAccount.mockResolvedValue(mockAccount);
      mockHashService.compareHash.mockResolvedValue(false);
      mockHashService.isLegacySha256.mockReturnValue(false);

      const result = await service.login({
        username: 'testuser',
        password: 'wrongpassword',
      });

      expect(result).toBeNull();
    });

    it('パスワードが空の場合は null を返す', async () => {
      const result = await service.login({
        username: 'testuser',
        password: '',
      });

      expect(result).toBeNull();
      expect(mockAccountRepository.getAccount).not.toHaveBeenCalled();
    });
  });

  describe('regist', () => {
    it('新規ユーザー登録が成功すると "success" を返す', async () => {
      mockAccountRepository.getAccount.mockResolvedValue(null);
      mockAccountRepository.createUser.mockResolvedValue(mockAccount);

      const result = await service.regist({
        username: 'newuser',
        password: 'password1',
      });

      expect(result).toBe('success');
      // bcrypt ハッシュを使用することを確認する
      expect(mockHashService.createHash).toHaveBeenCalledWith('password1');
    });

    it('ユーザー名が重複している場合は "duplicate" を返す', async () => {
      mockAccountRepository.getAccount.mockResolvedValue(mockAccount);

      const result = await service.regist({
        username: 'testuser',
        password: 'password1',
      });

      expect(result).toBe('duplicate');
    });

    it('DB書き込みエラー時は InternalServerErrorException をスローする', async () => {
      mockAccountRepository.getAccount.mockResolvedValue(null);
      mockAccountRepository.createUser.mockRejectedValue(new Error('DB error'));

      await expect(
        service.regist({ username: 'newuser', password: 'password1' }),
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
