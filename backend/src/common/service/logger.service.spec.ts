import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { LoggerService } from './logger.service';

/** NestJS Logger インスタンスメソッドをモックする */
const mockLog = jest.fn();
const mockWarn = jest.fn();
const mockError = jest.fn();

jest.spyOn(Logger.prototype, 'log').mockImplementation(mockLog);
jest.spyOn(Logger.prototype, 'warn').mockImplementation(mockWarn);
jest.spyOn(Logger.prototype, 'error').mockImplementation(mockError);

describe('LoggerService', () => {
  let service: LoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoggerService],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('Logger.log を message と context で呼び出す', () => {
      service.log('TestContext', 'テストメッセージ');

      expect(mockLog).toHaveBeenCalledWith('テストメッセージ', 'TestContext');
    });
  });

  describe('warn', () => {
    it('Logger.warn を message と context で呼び出す', () => {
      service.warn('TestContext', '警告メッセージ');

      expect(mockWarn).toHaveBeenCalledWith('警告メッセージ', 'TestContext');
    });
  });

  describe('error', () => {
    it('Logger.error を message と trace と context で呼び出す', () => {
      service.error('TestContext', 'エラーメッセージ', 'stack trace');

      expect(mockError).toHaveBeenCalledWith(
        'エラーメッセージ',
        'stack trace',
        'TestContext',
      );
    });

    it('trace を省略した場合も Logger.error を呼び出す', () => {
      service.error('TestContext', 'エラーメッセージ');

      expect(mockError).toHaveBeenCalledWith(
        'エラーメッセージ',
        undefined,
        'TestContext',
      );
    });
  });
});
