import { Module } from '@nestjs/common';
import { LoggerService } from './service/logger.service';
import { BatchQueueService } from './service/batch-queue.service';

/**
 * 共通サービスモジュール
 * LoggerService / BatchQueueService を他モジュールへ提供する。
 */
@Module({
  providers: [LoggerService, BatchQueueService],
  exports: [LoggerService, BatchQueueService],
})
export class CommonModule {}
