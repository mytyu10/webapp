import { Module } from '@nestjs/common';
import { LogController } from './controller/log.controller';
import { LogService } from './service/log.service';
import { GitHubModule } from 'src/github/github.module';
import { CommonModule } from 'src/common/common.module';

/**
 * フロントエンドログ収集モジュール
 * POST /log でフロントエンドの warn/error ログを受け取り、
 * ファイルへの書き出しと GitHub Issue 自動起票を行う
 */
@Module({
  imports: [GitHubModule, CommonModule],
  controllers: [LogController],
  providers: [LogService],
})
export class LogModule {}
