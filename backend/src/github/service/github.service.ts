import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import https from 'https';
import { GitHubRepository } from '../repository/github.repository';
import { LoggerService } from 'src/common/service/logger.service';
import { MESSAGE } from 'src/common/type/message';
import type {
  GitHubRepoResponseDto,
  GitHubIssueResponseDto,
} from '../dto/github.dto';

const CONTEXT = 'GitHubService';

/** GitHub OAuth 認可エンドポイント */
const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';

/** GitHub REST API ベース URL */
const GITHUB_API_BASE = 'api.github.com';

/**
 * HTTPS GET リクエストを送信して JSON レスポンスを返す
 */
function httpsGet<T>(
  hostname: string,
  path: string,
  headers: Record<string, string>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname, path, method: 'GET', headers },
      (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data) as T);
          } catch {
            reject(new Error('JSONのパースに失敗しました'));
          }
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

/**
 * HTTPS POST リクエストを送信して JSON レスポンスを返す
 */
function httpsPost<T>(
  hostname: string,
  path: string,
  body: string,
  headers: Record<string, string>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname,
        path,
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data) as T);
          } catch {
            reject(new Error('JSONのパースに失敗しました'));
          }
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/** GitHub Issue の生 API レスポンス型（必要フィールドのみ） */
interface GitHubIssueRaw {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  created_at: string;
  updated_at: string;
  pull_request?: unknown;
  user: { login: string };
}

/** GitHub トークン交換 API レスポンス型 */
interface GitHubTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

@Injectable()
export class GitHubService {
  constructor(
    private readonly githubRepository: GitHubRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * GitHub OAuth 認可 URL を生成して返す
   * state パラメータに username を Base64 エンコードして埋め込む
   */
  getOAuthUrl(username: string): string {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000';
    const callbackUrl = `${backendUrl}/github/oauth/callback`;

    if (!clientId) {
      this.logger.error(CONTEXT, 'GITHUB_CLIENT_ID が未設定です');
      throw new InternalServerErrorException(MESSAGE.GITHUB.OAUTH_URL_FAILED);
    }

    const state = Buffer.from(username).toString('base64');
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'repo',
      state,
    });

    return `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
  }

  /**
   * GitHub OAuth コールバック処理
   * state から username を復元してアクセストークンを DB に保存する
   */
  async handleCallback(code: string, state: string): Promise<string> {
    let username: string;
    try {
      username = Buffer.from(state, 'base64').toString('utf-8');
    } catch {
      this.logger.warn(CONTEXT, 'state のデコードに失敗しました');
      throw new BadRequestException(MESSAGE.GITHUB.CALLBACK_FAILED);
    }

    if (!username) {
      throw new BadRequestException(MESSAGE.GITHUB.CALLBACK_FAILED);
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000';
    const callbackUrl = `${backendUrl}/github/oauth/callback`;

    if (!clientId || !clientSecret) {
      this.logger.error(CONTEXT, 'GitHub OAuth 環境変数が未設定です');
      throw new InternalServerErrorException(MESSAGE.GITHUB.CALLBACK_FAILED);
    }

    const body = JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl,
    });

    let tokenRes: GitHubTokenResponse;
    try {
      tokenRes = await httpsPost<GitHubTokenResponse>(
        'github.com',
        '/login/oauth/access_token',
        body,
        { 'Content-Type': 'application/json', Accept: 'application/json' },
      );
    } catch (err) {
      this.logger.warn(CONTEXT, `トークン交換に失敗しました: ${String(err)}`);
      throw new InternalServerErrorException(MESSAGE.GITHUB.CALLBACK_FAILED);
    }

    if (!tokenRes.access_token) {
      this.logger.warn(
        CONTEXT,
        `GitHub からアクセストークンを取得できませんでした: ${tokenRes.error_description ?? ''}`,
      );
      throw new InternalServerErrorException(MESSAGE.GITHUB.CALLBACK_FAILED);
    }

    await this.githubRepository.upsertToken(username, tokenRes.access_token);
    this.logger.log(CONTEXT, `GitHub 連携完了: ${username}`);

    return username;
  }

  /**
   * GitHub 連携状態を取得する（トークンが存在するか確認）
   */
  async getStatus(username: string): Promise<boolean> {
    const token = await this.githubRepository.findToken(username);
    return token !== null;
  }

  /**
   * 連携リポジトリ一覧を取得する
   */
  async getRepos(username: string): Promise<GitHubRepoResponseDto[]> {
    const repos = await this.githubRepository.findAllRepos(username);
    return repos.map((r) => ({ id: r.id, owner: r.owner, repo: r.repo }));
  }

  /**
   * 連携リポジトリを追加する
   */
  async addRepo(
    username: string,
    owner: string,
    repo: string,
  ): Promise<GitHubRepoResponseDto> {
    const created = await this.githubRepository.createRepo(
      username,
      owner,
      repo,
    );
    if (!created) {
      throw new ConflictException(MESSAGE.GITHUB.REPO_ADD_DUPLICATE);
    }
    this.logger.log(CONTEXT, `リポジトリ追加: ${username} -> ${owner}/${repo}`);
    return { id: created.id, owner: created.owner, repo: created.repo };
  }

  /**
   * 連携リポジトリを削除する
   * 存在しない場合・他ユーザーのリポジトリの場合はエラーをスローする
   */
  async removeRepo(username: string, id: number): Promise<void> {
    const record = await this.githubRepository.findRepoById(id);
    if (!record) {
      throw new NotFoundException(MESSAGE.GITHUB.REPO_NOT_FOUND);
    }
    if (record.username !== username) {
      throw new ForbiddenException(MESSAGE.PERMISSION.FORBIDDEN);
    }
    await this.githubRepository.deleteRepo(id);
    this.logger.log(CONTEXT, `リポジトリ削除: ${username} -> id=${id}`);
  }

  /**
   * 全連携リポジトリの open な Issue を GitHub REST API 経由で取得する
   * PR は除外する
   */
  async getIssues(username: string): Promise<GitHubIssueResponseDto[]> {
    const token = await this.githubRepository.findToken(username);
    if (!token) {
      throw new ForbiddenException(MESSAGE.GITHUB.NOT_CONNECTED);
    }

    const repos = await this.githubRepository.findAllRepos(username);
    if (repos.length === 0) {
      return [];
    }

    const results: GitHubIssueResponseDto[] = [];

    await Promise.all(
      repos.map(async ({ owner, repo }) => {
        try {
          const issues = await httpsGet<GitHubIssueRaw[]>(
            GITHUB_API_BASE,
            `/repos/${owner}/${repo}/issues?state=open&per_page=100`,
            {
              Authorization: `Bearer ${token.access_token}`,
              Accept: 'application/vnd.github.v3+json',
              'User-Agent': 'webapp-github-integration',
            },
          );

          // PR を除外（pull_request フィールドが存在するものは PR）
          const filtered = Array.isArray(issues)
            ? issues.filter((issue) => !issue.pull_request)
            : [];

          for (const issue of filtered) {
            results.push({
              id: issue.id,
              number: issue.number,
              title: issue.title,
              html_url: issue.html_url,
              state: issue.state,
              owner,
              repo,
              created_at: issue.created_at,
              updated_at: issue.updated_at,
              user_login: issue.user?.login ?? '',
            });
          }
        } catch (err) {
          this.logger.warn(
            CONTEXT,
            `Issue取得失敗 ${owner}/${repo}: ${String(err)}`,
          );
          // 1リポジトリの失敗は他リポジトリに影響させない
        }
      }),
    );

    // updated_at 降順でソート
    results.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );

    return results;
  }

  /**
   * 指定リポジトリの open な Issue タイトル一覧を取得する（重複チェック用）
   * PR は除外する
   */
  async findOpenIssueTitles(
    accessToken: string,
    owner: string,
    repo: string,
  ): Promise<string[]> {
    const issues = await httpsGet<GitHubIssueRaw[]>(
      GITHUB_API_BASE,
      `/repos/${owner}/${repo}/issues?state=open&per_page=100`,
      {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'webapp-github-integration',
      },
    );

    if (!Array.isArray(issues)) return [];
    return issues
      .filter((issue) => !issue.pull_request)
      .map((issue) => issue.title);
  }

  /**
   * 指定リポジトリに GitHub Issue を起票する
   * ラベルは bug・frontend-error を付与する
   */
  async createIssue(
    accessToken: string,
    owner: string,
    repo: string,
    title: string,
    body: string,
  ): Promise<void> {
    const payload = JSON.stringify({
      title,
      body,
      labels: ['bug', 'frontend-error'],
    });

    await httpsPost<unknown>(
      GITHUB_API_BASE,
      `/repos/${owner}/${repo}/issues`,
      payload,
      {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'webapp-github-integration',
      },
    );
  }
}
