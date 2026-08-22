import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggerService],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
  });

  describe('log', () => {
    it('info レベルのメッセージをコンテキスト付きで出力する', () => {
      expect(() =>
        service.log('TestContext', 'テストメッセージ'),
      ).not.toThrow();
    });
  });

  describe('warn', () => {
    it('warn レベルのメッセージをコンテキスト付きで出力する', () => {
      expect(() => service.warn('TestContext', '警告メッセージ')).not.toThrow();
    });
  });

  describe('error', () => {
    it('error レベルのメッセージをコンテキスト付きで出力する', () => {
      expect(() =>
        service.error('TestContext', 'エラーメッセージ', 'stack trace'),
      ).not.toThrow();
    });

    it('trace を省略しても error を出力できる', () => {
      expect(() =>
        service.error('TestContext', 'エラーメッセージ'),
      ).not.toThrow();
    });
  });
});
