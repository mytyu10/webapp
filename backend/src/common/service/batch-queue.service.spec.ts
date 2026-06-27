import { Test, TestingModule } from '@nestjs/testing';
import { BatchQueueService } from './batch-queue.service';
import { LoggerService } from 'src/common/service/logger.service';

const mockLoggerService = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('BatchQueueService', () => {
  let service: BatchQueueService;

  beforeEach(async () => {
    jest.useFakeTimers();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchQueueService,
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<BatchQueueService>(BatchQueueService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('enqueue', () => {
    it('enqueue した関数が BATCH_WINDOW_MS 後に実行される', async () => {
      const fn = jest.fn().mockResolvedValue('result');

      const promise = service.enqueue(fn);

      // タイマー前は未実行
      expect(fn).not.toHaveBeenCalled();

      // 100ms 進める
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(fn).toHaveBeenCalledTimes(1);
      expect(result).toBe('result');
    });

    it('バッチウィンドウ内の複数 enqueue は 1 回のフラッシュでまとめて処理される', async () => {
      const fn1 = jest.fn().mockResolvedValue('r1');
      const fn2 = jest.fn().mockResolvedValue('r2');
      const fn3 = jest.fn().mockResolvedValue('r3');

      const p1 = service.enqueue(fn1);
      const p2 = service.enqueue(fn2);
      const p3 = service.enqueue(fn3);

      // タイマー前はまだ未実行
      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).not.toHaveBeenCalled();
      expect(fn3).not.toHaveBeenCalled();

      await jest.advanceTimersByTimeAsync(100);

      const results = await Promise.all([p1, p2, p3]);
      expect(results).toEqual(['r1', 'r2', 'r3']);
      expect(fn1).toHaveBeenCalledTimes(1);
      expect(fn2).toHaveBeenCalledTimes(1);
      expect(fn3).toHaveBeenCalledTimes(1);
    });

    it('ジョブが失敗した場合は reject され、他のジョブの処理は続行される', async () => {
      // async 関数でスローするとバッチ内で catch されるが、
      // enqueue が返す Promise は reject になる。
      // Promise.allSettled を先に登録してから タイマーを進めることで
      // unhandled rejection を回避する
      const failingFn = jest.fn().mockImplementation(async () => {
        throw new Error('job error');
      });
      const successFn = jest.fn().mockResolvedValue('ok');

      const p1 = service.enqueue(failingFn);
      const p2 = service.enqueue(successFn);

      // allSettled を先に登録してから advanceTimers を呼ぶ
      const settling = Promise.allSettled([p1, p2]);
      await jest.advanceTimersByTimeAsync(100);
      const [r1, r2] = await settling;

      expect(r1.status).toBe('rejected');
      if (r1.status === 'rejected') {
        expect((r1.reason as Error).message).toBe('job error');
      }
      expect(r2.status).toBe('fulfilled');
      if (r2.status === 'fulfilled') {
        expect(r2.value).toBe('ok');
      }
      expect(successFn).toHaveBeenCalledTimes(1);
    });

    it('enqueue の戻り値は関数の戻り値と一致する', async () => {
      const expected = { id: 1, title: 'タスク' };
      const fn = jest.fn().mockResolvedValue(expected);

      const promise = service.enqueue(fn);
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;
      expect(result).toEqual(expected);
    });

    it('フラッシュ中に追加されたジョブは次のバッチで処理される', async () => {
      let resolveFirst!: (v: string) => void;
      const firstFn = jest.fn().mockImplementation(
        () =>
          new Promise<string>((res) => {
            resolveFirst = res;
          }),
      );
      const secondFn = jest.fn().mockResolvedValue('second');

      // 1つ目をエンキュー
      const p1 = service.enqueue(firstFn);

      // バッチ起動
      await jest.advanceTimersByTimeAsync(100);

      // 1つ目の処理中（flushing=true）に 2つ目をエンキュー
      const p2 = service.enqueue(secondFn);
      expect(secondFn).not.toHaveBeenCalled();

      // 1つ目を完了させる
      resolveFirst('first');
      const result1 = await p1;
      expect(result1).toBe('first');

      // flushing が終わったので scheduleFlush が呼ばれ、次のバッチが動く
      await jest.advanceTimersByTimeAsync(100);

      const result2 = await p2;
      expect(result2).toBe('second');
      expect(secondFn).toHaveBeenCalledTimes(1);
    });
  });
});
