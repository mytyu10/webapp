import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import type {
  GitHubToken,
  GitHubRepository as PrismaGitHubRepository,
} from '@prisma/client';

/** Prisma の GitHubRepository モデルの型エイリアス */
export type GitHubRepoRecord = PrismaGitHubRepository;

@Injectable()
export class GitHubRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * ユーザーの GitHub アクセストークンを取得する
   */
  async findToken(username: string): Promise<GitHubToken | null> {
    return this.prisma.gitHubToken.findUnique({ where: { username } });
  }

  /**
   * GitHub アクセストークンを保存する（存在しない場合は作成、存在する場合は更新）
   */
  async upsertToken(username: string, accessToken: string): Promise<void> {
    await this.prisma.gitHubToken.upsert({
      where: { username },
      create: { username, access_token: accessToken },
      update: { access_token: accessToken },
    });
  }

  /**
   * ユーザーの連携リポジトリ一覧を取得する（作成日時昇順）
   */
  async findAllRepos(username: string): Promise<GitHubRepoRecord[]> {
    return this.prisma.gitHubRepository.findMany({
      where: { username },
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * 連携リポジトリを追加する
   * すでに同じ owner/repo が存在する場合は null を返す
   */
  async createRepo(
    username: string,
    owner: string,
    repo: string,
  ): Promise<GitHubRepoRecord | null> {
    const existing = await this.prisma.gitHubRepository.findUnique({
      where: { username_owner_repo: { username, owner, repo } },
    });
    if (existing) return null;

    return this.prisma.gitHubRepository.create({
      data: { username, owner, repo },
    });
  }

  /**
   * 連携リポジトリを ID で取得する
   */
  async findRepoById(id: number): Promise<GitHubRepoRecord | null> {
    return this.prisma.gitHubRepository.findUnique({ where: { id } });
  }

  /**
   * 連携リポジトリを削除する
   */
  async deleteRepo(id: number): Promise<void> {
    await this.prisma.gitHubRepository.delete({ where: { id } });
  }
}
