import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { GitHubService } from '../service/github.service';
import {
  AddGitHubRepoDto,
  GitHubIssueResponseDto,
  GitHubRepoResponseDto,
  GitHubStatusResponseDto,
} from '../dto/github.dto';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { HttpStatus } from 'src/common/type/status.enum';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';
import type { JwtPayload } from 'src/jwt/jwt.payload';

const CONTEXT = 'GitHubController';

/**
 * GitHub 連携コントローラー
 * OAuth フロー・リポジトリ管理・Issue 取得を提供する
 */
@Controller('github')
export class GitHubController {
  constructor(
    private readonly githubService: GitHubService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * GitHub OAuth 認可 URL を取得するエンドポイント
   * ログイン済みユーザーの username を state に埋め込んで返す
   */
  @Get('oauth/start')
  @UseGuards(JwtAuthGuard)
  getOAuthUrl(
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Response {
    this.logger.log(CONTEXT, `GitHub OAuth 開始: ${currentUser.username}`);
    const url = this.githubService.getOAuthUrl(currentUser.username);
    return response.status(HttpStatus.OK).json({ url });
  }

  /**
   * GitHub OAuth コールバックエンドポイント
   * GitHub からリダイレクトされ、アクセストークンを取得して DB に保存する。
   * 処理完了後はフロントエンドの /profile ページにリダイレクトする。
   * このエンドポイントは JwtAuthGuard を使用しない（ブラウザリダイレクトのため）
   */
  @Get('oauth/callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() response: Response,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

    if (!code || !state) {
      this.logger.warn(CONTEXT, 'OAuthコールバック: code または state が不正');
      response.redirect(`${frontendUrl}/profile?github=error`);
      return;
    }

    try {
      await this.githubService.handleCallback(code, state);
      this.logger.log(CONTEXT, 'GitHub OAuthコールバック完了');
      response.redirect(`${frontendUrl}/profile?github=success`);
    } catch (err) {
      this.logger.warn(CONTEXT, `OAuthコールバック失敗: ${String(err)}`);
      response.redirect(`${frontendUrl}/profile?github=error`);
    }
  }

  /**
   * GitHub 連携状態を取得するエンドポイント
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `GitHub 連携状態取得: ${currentUser.username}`);
    const connected = await this.githubService.getStatus(currentUser.username);
    const result: GitHubStatusResponseDto = { connected };
    return response.status(HttpStatus.OK).json(result);
  }

  /**
   * 連携リポジトリ一覧取得エンドポイント
   */
  @Get('repos')
  @UseGuards(JwtAuthGuard)
  async getRepos(
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `リポジトリ一覧取得: ${currentUser.username}`);
    const repos: GitHubRepoResponseDto[] = await this.githubService.getRepos(
      currentUser.username,
    );
    return response.status(HttpStatus.OK).json(repos);
  }

  /**
   * 連携リポジトリ追加エンドポイント
   */
  @Post('repos')
  @UseGuards(JwtAuthGuard)
  async addRepo(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: AddGitHubRepoDto,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(
      CONTEXT,
      `リポジトリ追加: ${currentUser.username} -> ${dto.owner}/${dto.repo}`,
    );
    const repo: GitHubRepoResponseDto = await this.githubService.addRepo(
      currentUser.username,
      dto.owner,
      dto.repo,
    );
    return response
      .status(HttpStatus.CREATED)
      .json({ message: MESSAGE.GITHUB.REPO_ADD_SUCCESS, repo });
  }

  /**
   * 連携リポジトリ削除エンドポイント
   */
  @Delete('repos/:id')
  @UseGuards(JwtAuthGuard)
  async removeRepo(
    @CurrentUser() currentUser: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(
      CONTEXT,
      `リポジトリ削除: ${currentUser.username} -> id=${id}`,
    );
    await this.githubService.removeRepo(currentUser.username, id);
    return response
      .status(HttpStatus.OK)
      .json({ message: MESSAGE.GITHUB.REPO_DELETE_SUCCESS });
  }

  /**
   * 全連携リポジトリの GitHub Issue 一覧取得エンドポイント
   */
  @Get('issues')
  @UseGuards(JwtAuthGuard)
  async getIssues(
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `Issue一覧取得: ${currentUser.username}`);
    const issues: GitHubIssueResponseDto[] = await this.githubService.getIssues(
      currentUser.username,
    );
    return response.status(HttpStatus.OK).json(issues);
  }
}
