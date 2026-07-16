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
};

const mockAccountRepository = {
  getAccount: jest.fn(),
  createUser: jest.fn(),
};

/**
 * HashService のモック
 * - createHash: bcrypt ハッシュを返す（async）
 * - compareHash: bcrypt 照合結果を返す（async）
 */
const mockHashService = {
  createHash: jest.fn().mockResolvedValue('$2b$10$mockedhashvalue'),
  compareHash: jest.fn().mockResolvedValue(false),
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
    mockJwtService.createToken.mockReturnValue('mock_token');
  });

  describe('login', () => {
    it('bcrypt照合が成功するとJWTトークンを返す', async () => {
      mockAccountRepository.getAccount.mockResolvedValue(mockAccount);
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

    it('存在しないユーザーの場合は null を返す', async () => {
      mockAccountRepository.getAccount.mockResolvedValue(null);

      const result = await service.login({
        username: 'nonexist',
        password: 'pass',
      });

      expect(result).toBeNull();
    });

    it('パスワードが一致しない場合は null を返す', async () => {
      mockAccountRepository.getAccount.mockResolvedValue(mockAccount);
      mockHashService.compareHash.mockResolvedValue(false);

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

  describe('getMe', () => {
    it('ログインユーザー情報を返す', async () => {
      mockAccountRepository.getAccount.mockResolvedValue(mockAccount);

      const result = await service.getMe('testuser');

      expect(result.username).toBe('testuser');
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
