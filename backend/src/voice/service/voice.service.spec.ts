import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { LoggerService } from 'src/common/service/logger.service';
import { MESSAGE } from 'src/common/type/message';

/** Anthropic messages.create のモック関数 */
const mockCreate = jest.fn();

/** Anthropic SDK をモックする */
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  })),
}));

const mockLoggerService = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

/** テキストブロックを持つ Anthropic レスポンスを生成するヘルパー */
function makeAnthropicResponse(text: string) {
  return {
    content: [{ type: 'text', text }],
  };
}

describe('VoiceService', () => {
  let service: VoiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceService,
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<VoiceService>(VoiceService);
    jest.clearAllMocks();
  });

  describe('processCommand', () => {
    it('navigate アクションを正しく解析する', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse(
          '{"action":"navigate","params":{"path":"/tasks"}}',
        ),
      );

      const result = await service.processCommand('タスク管理を開いて');

      expect(result.action).toBe('navigate');
      expect((result.params as { path: string }).path).toBe('/tasks');
    });

    it('create_task アクションを正しく解析する', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse(
          '{"action":"create_task","params":{"title":"レポート作成","priority":"HIGH"}}',
        ),
      );

      const result = await service.processCommand(
        '高優先度でレポート作成タスクを追加して',
      );

      expect(result.action).toBe('create_task');
      const params = result.params as { title: string; priority: string };
      expect(params.title).toBe('レポート作成');
      expect(params.priority).toBe('HIGH');
    });

    it('complete_task アクションを正しく解析する', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse(
          '{"action":"complete_task","params":{"title":"レポート"}}',
        ),
      );

      const result =
        await service.processCommand('レポートのタスクを完了にして');

      expect(result.action).toBe('complete_task');
      expect((result.params as { title: string }).title).toBe('レポート');
    });

    it('create_event アクションを正しく解析する', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse(
          '{"action":"create_event","params":{"title":"ミーティング","start_at":"2026-08-23T15:00:00.000Z","end_at":"2026-08-23T16:00:00.000Z"}}',
        ),
      );

      const result = await service.processCommand(
        '明日の午後3時にミーティングを追加して',
      );

      expect(result.action).toBe('create_event');
      const params = result.params as { title: string; start_at: string };
      expect(params.title).toBe('ミーティング');
      expect(params.start_at).toBeTruthy();
    });

    it('unknown アクションを正しく解析する', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse('{"action":"unknown","params":{}}'),
      );

      const result = await service.processCommand('よくわからないコマンド');

      expect(result.action).toBe('unknown');
    });

    it('コードブロック付きのレスポンスでもJSONを正しく抽出する', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse(
          '```json\n{"action":"navigate","params":{"path":"/calendar"}}\n```',
        ),
      );

      const result = await service.processCommand('カレンダーを開いて');

      expect(result.action).toBe('navigate');
      expect((result.params as { path: string }).path).toBe('/calendar');
    });

    it('JSONのパースに失敗した場合は unknown を返す', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse('これはJSONではありません'),
      );

      const result = await service.processCommand('不明な入力');

      expect(result.action).toBe('unknown');
      expect(result.params).toEqual({});
    });

    it('不正なアクション種別の場合は unknown を返す', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse('{"action":"invalid_action","params":{}}'),
      );

      const result = await service.processCommand('不明なアクション');

      expect(result.action).toBe('unknown');
    });

    it('Claude API呼び出しが失敗した場合は InternalServerErrorException をスローする', async () => {
      mockCreate.mockRejectedValue(new Error('API接続エラー'));

      await expect(service.processCommand('テスト')).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.processCommand('テスト')).rejects.toThrow(
        MESSAGE.VOICE.COMMAND_FAILED,
      );
    });

    it('複数のtextブロックがある場合は結合してパースする', async () => {
      mockCreate.mockResolvedValue({
        content: [
          { type: 'text', text: '{"action":"navigate",' },
          { type: 'text', text: '"params":{"path":"/links"}}' },
        ],
      });

      const result = await service.processCommand('リンク集を開いて');

      expect(result.action).toBe('navigate');
      expect((result.params as { path: string }).path).toBe('/links');
    });
  });
});
