import { Injectable } from '@nestjs/common';
import { LoggerService } from 'src/common/service/logger.service';

const CONTEXT = 'BatchQueueService';

/** バッチウィンドウのミリ秒数 */
const BATCH_WINDOW_MS = 100;

interface BatchJob {
  execute: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

/**
 * 汎用バッチキューサービス
 * BATCH_WINDOW_MS 内に追加された処理リクエストを一括でバッファリングし、
 * タイマー起動後にまとめて順次処理することで、連打時の過剰なDB書き込みを防ぐ。
 */
@Injectable()
export class BatchQueueService {
  constructor(private readonly logger: LoggerService) {}

  private readonly buffer: BatchJob[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private flushing = false;

  /**
   * 処理関数をバッファに追加し、バッチウィンドウ後に一括処理する。
   * flushing 中でなければ scheduleFlush() を呼んでタイマーをセットする。
   * enqueue() 自体はバッチ完了まで待機して結果を返す Promise を返す。
   */
  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.buffer.push({
        execute: fn as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.logger.log(
        CONTEXT,
        `バッチ追加 (バッファ: ${this.buffer.length}件)`,
      );
      if (!this.flushing) {
        this.scheduleFlush();
      }
    });
  }

  /**
   * flushTimer が未設定の場合に BATCH_WINDOW_MS 後の flushBatch 実行をスケジュールする。
   * 既にタイマーが設定済みの場合は何もしない（重複スケジュールを防ぐ）。
   */
  private scheduleFlush(): void {
    if (this.flushTimer !== null) {
      return;
    }
    this.flushTimer = setTimeout(() => {
      void this.flushBatch();
    }, BATCH_WINDOW_MS);
  }

  /**
   * バッファに蓄積されたジョブを一括で順次処理する。
   * タイマーをリセットしてから buffer をドレインし、ジョブごとに try/catch で
   * 個別エラーをハンドリングする。finally で flushing フラグを確実にリセットし、
   * 処理後にバッファが残っていれば再スケジュールする。
   */
  private async flushBatch(): Promise<void> {
    this.flushTimer = null;
    const batch = this.buffer.splice(0);
    if (batch.length === 0) {
      return;
    }

    this.logger.log(CONTEXT, `バッチ処理開始: ${batch.length}件`);
    this.flushing = true;
    try {
      for (const job of batch) {
        try {
          const result = await job.execute();
          job.resolve(result);
        } catch (err) {
          job.reject(err);
          this.logger.warn(CONTEXT, `バッチジョブ処理失敗: ${String(err)}`);
        }
      }
      this.logger.log(CONTEXT, 'バッチ処理完了');
    } finally {
      this.flushing = false;
      if (this.buffer.length > 0) {
        this.scheduleFlush();
      }
    }
  }
}
