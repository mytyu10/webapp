import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { GitHubService } from './github.service';
import { GitHubRepository } from '../repository/github.repository';
import { LoggerService } from 'src/common/service/logger.service';
import { MESSAGE } from 'src/common/type/message';

/** モック用 GitHub トークンデータ */
const mockToken = {
  username: 'testuser',
  access_token: 'ghp_testtoken',
};

/** モック用リポジトリデータ */
const mockRepo = {
  id: 1,
  username: 'testuser',
  owner: 'octocat',
  repo: 'hello-world',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
};

const mockGitHubRepository = {
  findToken: jest.fn(),
  upsertToken: jest.fn(),
  findAllRepos: jest.fn(),
  createRepo: jest.fn(),
  findRepoById: jest.fn(),
  deleteRepo: jest.fn(),
};

const mockLoggerService = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('GitHubService', () => {
  let service: GitHubService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubService,
        { provide: GitHubRepository, useValue: mockGitHubRepository },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<GitHubService>(GitHubService);
    jest.clearAllMocks();
  });

  // ────────────────────────────────────────────────
  // getOAuthUrl
  // ────────────────────────────────────────────────
  describe('getOAuthUrl', () => {
    it('GITHUB_CLIENT_ID が未設定の場合は InternalServerErrorException をスローする', () => {
      const originalClientId = process.env.GITHUB_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_ID;

      expect(() => service.getOAuthUrl('testuser')).toThrow(
        InternalServerErrorException,
      );

      process.env.GITHUB_CLIENT_ID = originalClientId;
    });

    it('GITHUB_CLIENT_ID が設定済みの場合は GitHub OAuth URL を返す', () => {
      process.env.GITHUB_CLIENT_ID = 'test_client_id';

      const url = service.getOAuthUrl('testuser');

      expect(url).toContain('https://github.com/login/oauth/authorize');
      expect(url).toContain('client_id=test_client_id');
      expect(url).toContain('scope=repo');
      // URLSearchParams は = を %3D にエンコードするため URL をパースして検証する
      const parsed = new URL(url);
      const encodedState = parsed.searchParams.get('state');
      const decodedUsername = Buffer.from(
        encodedState ?? '',
        'base64',
      ).toString('utf-8');
      expect(decodedUsername).toBe('testuser');
    });
  });

  // ────────────────────────────────────────────────
  // handleCallback
  // ────────────────────────────────────────────────
  describe('handleCallback', () => {
    it('state が空文字列の場合は BadRequestException をスローする', async () => {
      await expect(service.handleCallback('code', '')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('GITHUB_CLIENT_SECRET が未設定の場合は InternalServerErrorException をスローする', async () => {
      process.env.GITHUB_CLIENT_ID = 'test_client_id';
      const originalSecret = process.env.GITHUB_CLIENT_SECRET;
      delete process.env.GITHUB_CLIENT_SECRET;

      const state = Buffer.from('testuser').toString('base64');

      await expect(service.handleCallback('code', state)).rejects.toThrow(
        InternalServerErrorException,
      );

      process.env.GITHUB_CLIENT_SECRET = originalSecret;
    });
  });

  // ────────────────────────────────────────────────
  // getStatus
  // ────────────────────────────────────────────────
  describe('getStatus', () => {
    it('トークンが存在する場合は true を返す', async () => {
      mockGitHubRepository.findToken.mockResolvedValue(mockToken);

      const result = await service.getStatus('testuser');

      expect(result).toBe(true);
    });

    it('トークンが存在しない場合は false を返す', async () => {
      mockGitHubRepository.findToken.mockResolvedValue(null);

      const result = await service.getStatus('testuser');

      expect(result).toBe(false);
    });
  });

  // ────────────────────────────────────────────────
  // getRepos
  // ────────────────────────────────────────────────
  describe('getRepos', () => {
    it('連携リポジトリ一覧を DTO に変換して返す', async () => {
      mockGitHubRepository.findAllRepos.mockResolvedValue([mockRepo]);

      const result = await service.getRepos('testuser');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 1,
        owner: 'octocat',
        repo: 'hello-world',
      });
    });

    it('リポジトリが存在しない場合は空配列を返す', async () => {
      mockGitHubRepository.findAllRepos.mockResolvedValue([]);

      const result = await service.getRepos('testuser');

      expect(result).toHaveLength(0);
    });
  });

  // ────────────────────────────────────────────────
  // addRepo
  // ────────────────────────────────────────────────
  describe('addRepo', () => {
    it('リポジトリを追加して DTO を返す', async () => {
      mockGitHubRepository.createRepo.mockResolvedValue(mockRepo);

      const result = await service.addRepo(
        'testuser',
        'octocat',
        'hello-world',
      );

      expect(result).toEqual({ id: 1, owner: 'octocat', repo: 'hello-world' });
    });

    it('重複する場合は ConflictException をスローする', async () => {
      mockGitHubRepository.createRepo.mockResolvedValue(null);

      await expect(
        service.addRepo('testuser', 'octocat', 'hello-world'),
      ).rejects.toThrow(ConflictException);
    });

    it('ConflictException のメッセージを確認する', async () => {
      mockGitHubRepository.createRepo.mockResolvedValue(null);

      try {
        await service.addRepo('testuser', 'octocat', 'hello-world');
      } catch (err) {
        expect((err as ConflictException).message).toBe(
          MESSAGE.GITHUB.REPO_ADD_DUPLICATE,
        );
      }
    });
  });

  // ────────────────────────────────────────────────
  // removeRepo
  // ────────────────────────────────────────────────
  describe('removeRepo', () => {
    it('存在しない ID の場合は NotFoundException をスローする', async () => {
      mockGitHubRepository.findRepoById.mockResolvedValue(null);

      await expect(service.removeRepo('testuser', 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('他ユーザーのリポジトリの場合は ForbiddenException をスローする', async () => {
      mockGitHubRepository.findRepoById.mockResolvedValue({
        ...mockRepo,
        username: 'otheruser',
      });

      await expect(service.removeRepo('testuser', 1)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('正常時はリポジトリの deleteRepo を呼び出す', async () => {
      mockGitHubRepository.findRepoById.mockResolvedValue(mockRepo);
      mockGitHubRepository.deleteRepo.mockResolvedValue(undefined);

      await service.removeRepo('testuser', 1);

      expect(mockGitHubRepository.deleteRepo).toHaveBeenCalledWith(1);
    });
  });
});
