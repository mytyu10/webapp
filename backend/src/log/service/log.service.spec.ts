import { Test, TestingModule } from '@nestjs/testing';
import { LogService } from './log.service';
import { GitHubService } from 'src/github/service/github.service';
import { GitHubRepository } from 'src/github/repository/github.repository';
import { LoggerService } from 'src/common/service/logger.service';
import type { CreateLogDto } from '../dto/log.dto';

const mockGitHubService = {
  findOpenIssueTitles: jest.fn(),
  createIssue: jest.fn(),
};

const mockGitHubRepository = {
  findToken: jest.fn(),
  findAllRepos: jest.fn(),
};

const mockLoggerService = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('LogService', () => {
  let service: LogService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogService,
        { provide: GitHubService, useValue: mockGitHubService },
        { provide: GitHubRepository, useValue: mockGitHubRepository },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<LogService>(LogService);
  });

  describe('handleLog', () => {
    it('warn レベルのログを処理し、GitHub Issue 起票をスキップする', async () => {
      const dto: CreateLogDto = {
        level: 'warn',
        context: 'useTaskList',
        message: '警告テスト',
        timestamp: '2026-08-22T10:00:00.000Z',
      };

      await service.handleLog(dto, 'user1');

      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        'LogService',
        '[frontend/useTaskList] 警告テスト',
      );
      // warn では GitHub Issue 起票処理を呼ばない
      expect(mockGitHubRepository.findToken).not.toHaveBeenCalled();
    });

    it('error レベルのログを処理し、GitHub Issue 起票を試みる', async () => {
      mockGitHubRepository.findToken.mockResolvedValue({
        username: 'user1',
        access_token: 'token123',
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockGitHubRepository.findAllRepos.mockResolvedValue([
        {
          id: 1,
          username: 'user1',
          owner: 'user1',
          repo: 'my-repo',
          created_at: new Date(),
        },
      ]);
      mockGitHubService.findOpenIssueTitles.mockResolvedValue([]);
      mockGitHubService.createIssue.mockResolvedValue(undefined);

      const dto: CreateLogDto = {
        level: 'error',
        context: 'useTaskList',
        message: 'タスク取得エラー',
        timestamp: '2026-08-22T10:00:00.000Z',
      };

      await service.handleLog(dto, 'user1');

      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'LogService',
        '[frontend/useTaskList] タスク取得エラー',
      );
      expect(mockGitHubRepository.findToken).toHaveBeenCalledWith('user1');
      expect(mockGitHubService.createIssue).toHaveBeenCalled();
    });

    it('GitHub 未連携（トークンなし）の場合は Issue 起票をスキップする', async () => {
      mockGitHubRepository.findToken.mockResolvedValue(null);

      const dto: CreateLogDto = {
        level: 'error',
        context: 'CalendarPage',
        message: 'カレンダーエラー',
        timestamp: '2026-08-22T10:00:00.000Z',
      };

      await service.handleLog(dto, 'user1');

      expect(mockGitHubRepository.findToken).toHaveBeenCalledWith('user1');
      expect(mockGitHubService.createIssue).not.toHaveBeenCalled();
    });

    it('連携リポジトリがない場合は Issue 起票をスキップする', async () => {
      mockGitHubRepository.findToken.mockResolvedValue({
        username: 'user1',
        access_token: 'token123',
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockGitHubRepository.findAllRepos.mockResolvedValue([]);

      const dto: CreateLogDto = {
        level: 'error',
        context: 'LinkListPage',
        message: 'リンクエラー',
        timestamp: '2026-08-22T10:00:00.000Z',
      };

      await service.handleLog(dto, 'user1');

      expect(mockGitHubService.createIssue).not.toHaveBeenCalled();
    });

    it('同タイトルの open Issue が既存の場合は重複起票しない', async () => {
      mockGitHubRepository.findToken.mockResolvedValue({
        username: 'user1',
        access_token: 'token123',
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockGitHubRepository.findAllRepos.mockResolvedValue([
        {
          id: 1,
          username: 'user1',
          owner: 'user1',
          repo: 'my-repo',
          created_at: new Date(),
        },
      ]);
      // すでに同じタイトルの Issue が存在する
      mockGitHubService.findOpenIssueTitles.mockResolvedValue([
        '[Frontend Error] DuplicateContext: 重複エラー',
      ]);

      const dto: CreateLogDto = {
        level: 'error',
        context: 'DuplicateContext',
        message: '重複エラー',
        timestamp: '2026-08-22T10:00:00.000Z',
      };

      await service.handleLog(dto, 'user1');

      expect(mockGitHubService.createIssue).not.toHaveBeenCalled();
      expect(mockLoggerService.log).toHaveBeenCalledWith(
        'LogService',
        expect.stringContaining('重複 Issue のためスキップ'),
      );
    });

    it('Issue 起票が失敗してもエラーを伝播させない', async () => {
      mockGitHubRepository.findToken.mockResolvedValue({
        username: 'user1',
        access_token: 'token123',
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockGitHubRepository.findAllRepos.mockResolvedValue([
        {
          id: 1,
          username: 'user1',
          owner: 'user1',
          repo: 'my-repo',
          created_at: new Date(),
        },
      ]);
      mockGitHubService.findOpenIssueTitles.mockResolvedValue([]);
      mockGitHubService.createIssue.mockRejectedValue(
        new Error('GitHub API エラー'),
      );

      const dto: CreateLogDto = {
        level: 'error',
        context: 'ErrorContext',
        message: 'エラーメッセージ',
        timestamp: '2026-08-22T10:00:00.000Z',
      };

      // エラーを伝播させない
      await expect(service.handleLog(dto, 'user1')).resolves.toBeUndefined();
      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        'LogService',
        expect.stringContaining('GitHub Issue 起票失敗'),
      );
    });
  });
});
