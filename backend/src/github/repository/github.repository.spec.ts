import { Test, TestingModule } from '@nestjs/testing';
import { GitHubRepository } from './github.repository';
import { PrismaService } from 'src/prisma/prisma.service';

/** モック用トークンデータ */
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

/** PrismaService のモック */
const mockPrismaService = {
  gitHubToken: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  gitHubRepository: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
};

describe('GitHubRepository', () => {
  let repository: GitHubRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitHubRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get<GitHubRepository>(GitHubRepository);
    jest.clearAllMocks();
  });

  // ────────────────────────────────────────────────
  // findToken
  // ────────────────────────────────────────────────
  describe('findToken', () => {
    it('prisma.gitHubToken.findUnique を username で呼び出す', async () => {
      mockPrismaService.gitHubToken.findUnique.mockResolvedValue(mockToken);

      await repository.findToken('testuser');

      expect(mockPrismaService.gitHubToken.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('トークンが存在する場合はトークンを返す', async () => {
      mockPrismaService.gitHubToken.findUnique.mockResolvedValue(mockToken);

      const result = await repository.findToken('testuser');

      expect(result).not.toBeNull();
      expect(result?.access_token).toBe('ghp_testtoken');
    });

    it('トークンが存在しない場合は null を返す', async () => {
      mockPrismaService.gitHubToken.findUnique.mockResolvedValue(null);

      const result = await repository.findToken('testuser');

      expect(result).toBeNull();
    });
  });

  // ────────────────────────────────────────────────
  // upsertToken
  // ────────────────────────────────────────────────
  describe('upsertToken', () => {
    it('prisma.gitHubToken.upsert を username と accessToken で呼び出す', async () => {
      mockPrismaService.gitHubToken.upsert.mockResolvedValue(mockToken);

      await repository.upsertToken('testuser', 'ghp_newtoken');

      expect(mockPrismaService.gitHubToken.upsert).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        create: { username: 'testuser', access_token: 'ghp_newtoken' },
        update: { access_token: 'ghp_newtoken' },
      });
    });
  });

  // ────────────────────────────────────────────────
  // findAllRepos
  // ────────────────────────────────────────────────
  describe('findAllRepos', () => {
    it('prisma.gitHubRepository.findMany を username と created_at 昇順で呼び出す', async () => {
      mockPrismaService.gitHubRepository.findMany.mockResolvedValue([mockRepo]);

      await repository.findAllRepos('testuser');

      expect(mockPrismaService.gitHubRepository.findMany).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        orderBy: { created_at: 'asc' },
      });
    });

    it('リポジトリ一覧を返す', async () => {
      mockPrismaService.gitHubRepository.findMany.mockResolvedValue([mockRepo]);

      const result = await repository.findAllRepos('testuser');

      expect(result).toHaveLength(1);
      expect(result[0].owner).toBe('octocat');
    });
  });

  // ────────────────────────────────────────────────
  // createRepo
  // ────────────────────────────────────────────────
  describe('createRepo', () => {
    it('重複するリポジトリが存在する場合は null を返す', async () => {
      mockPrismaService.gitHubRepository.findUnique.mockResolvedValue(mockRepo);

      const result = await repository.createRepo(
        'testuser',
        'octocat',
        'hello-world',
      );

      expect(result).toBeNull();
      expect(mockPrismaService.gitHubRepository.create).not.toHaveBeenCalled();
    });

    it('重複がない場合はリポジトリを作成して返す', async () => {
      mockPrismaService.gitHubRepository.findUnique.mockResolvedValue(null);
      mockPrismaService.gitHubRepository.create.mockResolvedValue(mockRepo);

      const result = await repository.createRepo(
        'testuser',
        'octocat',
        'hello-world',
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
      expect(mockPrismaService.gitHubRepository.create).toHaveBeenCalledWith({
        data: { username: 'testuser', owner: 'octocat', repo: 'hello-world' },
      });
    });
  });

  // ────────────────────────────────────────────────
  // findRepoById
  // ────────────────────────────────────────────────
  describe('findRepoById', () => {
    it('prisma.gitHubRepository.findUnique を id で呼び出す', async () => {
      mockPrismaService.gitHubRepository.findUnique.mockResolvedValue(mockRepo);

      await repository.findRepoById(1);

      expect(
        mockPrismaService.gitHubRepository.findUnique,
      ).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('存在する場合はリポジトリを返す', async () => {
      mockPrismaService.gitHubRepository.findUnique.mockResolvedValue(mockRepo);

      const result = await repository.findRepoById(1);

      expect(result?.id).toBe(1);
    });

    it('存在しない場合は null を返す', async () => {
      mockPrismaService.gitHubRepository.findUnique.mockResolvedValue(null);

      const result = await repository.findRepoById(999);

      expect(result).toBeNull();
    });
  });

  // ────────────────────────────────────────────────
  // deleteRepo
  // ────────────────────────────────────────────────
  describe('deleteRepo', () => {
    it('prisma.gitHubRepository.delete を id で呼び出す', async () => {
      mockPrismaService.gitHubRepository.delete.mockResolvedValue(mockRepo);

      await repository.deleteRepo(1);

      expect(mockPrismaService.gitHubRepository.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });
});
