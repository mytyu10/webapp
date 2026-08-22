import { Module } from '@nestjs/common';
import { GitHubController } from './controller/github.controller';
import { GitHubService } from './service/github.service';
import { GitHubRepository } from './repository/github.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommonModule } from 'src/common/common.module';

/**
 * GitHub 連携モジュール
 * OAuth フロー・リポジトリ管理・Issue 取得を提供する
 */
@Module({
  imports: [CommonModule],
  controllers: [GitHubController],
  providers: [GitHubService, GitHubRepository, PrismaService],
})
export class GitHubModule {}
