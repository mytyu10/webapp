import { Injectable } from '@nestjs/common';
import winston from 'winston';
import path from 'path';
import { GitHubService } from 'src/github/service/github.service';
import { GitHubRepository } from 'src/github/repository/github.repository';
import { LoggerService } from 'src/common/service/logger.service';
import type { CreateLogDto } from '../dto/log.dto';

const CONTEXT = 'LogService';

/** ログファイルの出力先ディレクトリ（プロジェクトルートの logs/ 配下） */
const LOG_DIR = path.resolve(process.cwd(), 'logs');

/** フロントエンドログ専用 Winston ロガー */
const frontendFileLogger = winston.createLogger({
  transports: [
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'app.log'),
      level: 'warn',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
});

/**
 * フロントエンドログ収集サービス
 * 受け取ったログをファイルに書き出し、error レベルの場合は GitHub Issue を自動起票する。
 */
@Injectable()
export class LogService {
  constructor(
    private readonly githubService: GitHubService,
    private readonly githubRepository: GitHubRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * フロントエンドから受け取ったログを処理する
   * - warn/error: logs/app.log にファイル書き出し
   * - error: GitHub Issue を自動起票（GitHub 未連携の場合はスキップ）
   */
  async handleLog(dto: CreateLogDto, username: string): Promise<void> {
    const logEntry = {
      source: 'frontend',
      username,
      context: dto.context,
      message: dto.message,
      clientTimestamp: dto.timestamp,
    };

    if (dto.level === 'warn') {
      frontendFileLogger.warn(dto.message, logEntry);
      this.logger.warn(CONTEXT, `[frontend/${dto.context}] ${dto.message}`);
    } else {
      frontendFileLogger.error(dto.message, logEntry);
      this.logger.error(CONTEXT, `[frontend/${dto.context}] ${dto.message}`);
      // error レベルのみ GitHub Issue 自動起票を試みる
      await this.tryCreateGitHubIssue(username, dto.context, dto.message);
    }
  }

  /**
   * GitHub Issue を自動起票する
   * - GitHub 未連携（トークンなし）の場合はスキップ
   * - 連携リポジトリが0件の場合はスキップ
   * - 同タイトルの open Issue が既存の場合は重複起票しない
   * - 失敗時はエラーを飲み込みログのみ出力する
   */
  private async tryCreateGitHubIssue(
    username: string,
    context: string,
    message: string,
  ): Promise<void> {
    try {
      const tokenRecord = await this.githubRepository.findToken(username);
      if (!tokenRecord) {
        // GitHub 未連携のためスキップ
        return;
      }

      const repos = await this.githubRepository.findAllRepos(username);
      if (repos.length === 0) {
        // 連携リポジトリなしのためスキップ
        return;
      }

      // 最初の1件を起票先とする
      const { owner, repo } = repos[0];
      const issueTitle = `[Frontend Error] ${context}: ${message}`.slice(
        0,
        256,
      );

      // 重複チェック: 同タイトルの open Issue が既存の場合はスキップ
      const openTitles = await this.githubService.findOpenIssueTitles(
        tokenRecord.access_token,
        owner,
        repo,
      );
      if (openTitles.includes(issueTitle)) {
        this.logger.log(
          CONTEXT,
          `重複 Issue のためスキップ: ${owner}/${repo} "${issueTitle}"`,
        );
        return;
      }

      const issueBody = [
        '## フロントエンドエラー自動起票',
        '',
        `**コンテキスト:** ${context}`,
        `**メッセージ:** ${message}`,
        `**ユーザー:** ${username}`,
        '',
        '_この Issue はフロントエンドのエラーログから自動起票されました。_',
      ].join('\n');

      await this.githubService.createIssue(
        tokenRecord.access_token,
        owner,
        repo,
        issueTitle,
        issueBody,
      );

      this.logger.log(
        CONTEXT,
        `GitHub Issue 起票完了: ${owner}/${repo} "${issueTitle}"`,
      );
    } catch (err) {
      // Issue 起票の失敗はログ収集処理全体に影響させない
      this.logger.warn(CONTEXT, `GitHub Issue 起票失敗: ${String(err)}`);
    }
  }
}
