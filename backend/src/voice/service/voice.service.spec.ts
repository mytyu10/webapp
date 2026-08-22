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

  describe('processCommand（初回）', () => {
    it('navigate アクションを正しく解析する', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse(
          '{"action":"navigate","params":{"path":"/tasks"},"reply":"タスク管理画面に移動します","needs_followup":false,"collected_params":{}}',
        ),
      );

      const result = await service.processCommand('タスク管理を開いて');

      expect(result.action).toBe('navigate');
      expect((result.params as { path: string }).path).toBe('/tasks');
      expect(result.needs_followup).toBe(false);
    });

    it('create_task アクションを正しく解析する', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse(
          '{"action":"create_task","params":{},"reply":"期限と優先度はありますか？","needs_followup":true,"collected_params":{"title":"レポート作成","priority":"HIGH"}}',
        ),
      );

      const result = await service.processCommand(
        '高優先度でレポート作成タスクを追加して',
      );

      expect(result.action).toBe('create_task');
      expect(result.needs_followup).toBe(true);
      expect(result.collected_params).toEqual({
        title: 'レポート作成',
        priority: 'HIGH',
      });
    });

    it('complete_task アクションを正しく解析する', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse(
          '{"action":"complete_task","params":{"title":"レポート"},"reply":"タスクを完了にします","needs_followup":false,"collected_params":{}}',
        ),
      );

      const result =
        await service.processCommand('レポートのタスクを完了にして');

      expect(result.action).toBe('complete_task');
      expect((result.params as { title: string }).title).toBe('レポート');
      expect(result.needs_followup).toBe(false);
    });

    it('create_event アクションを正しく解析する', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse(
          '{"action":"create_event","params":{},"reply":"終了時刻はありますか？","needs_followup":true,"collected_params":{"title":"ミーティング","start_at":"2026-08-23T06:00:00.000Z"}}',
        ),
      );

      const result = await service.processCommand(
        '明日の午後3時にミーティングを追加して',
      );

      expect(result.action).toBe('create_event');
      expect(result.needs_followup).toBe(true);
      expect(result.collected_params).toMatchObject({ title: 'ミーティング' });
    });

    it('unknown アクションを正しく解析する', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse(
          '{"action":"unknown","params":{},"reply":"","needs_followup":false,"collected_params":{}}',
        ),
      );

      const result = await service.processCommand('よくわからないコマンド');

      expect(result.action).toBe('unknown');
      expect(result.needs_followup).toBe(false);
    });

    it('コードブロック付きのレスポンスでもJSONを正しく抽出する', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse(
          '```json\n{"action":"navigate","params":{"path":"/calendar"},"reply":"カレンダーに移動します","needs_followup":false,"collected_params":{}}\n```',
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
      expect(result.needs_followup).toBe(false);
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
          {
            type: 'text',
            text: '"params":{"path":"/links"},"reply":"リンク集に移動します","needs_followup":false,"collected_params":{}}',
          },
        ],
      });

      const result = await service.processCommand('リンク集を開いて');

      expect(result.action).toBe('navigate');
      expect((result.params as { path: string }).path).toBe('/links');
    });
  });

  describe('processCommand（フォローアップ）', () => {
    it('create_task フォローアップで追加情報を正しく収集する', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse(
          '{"collected_params":{"title":"レポート作成","due_date":"2026-08-24T15:00:00.000Z"},"needs_followup":false,"reply":"レポート作成タスクを登録しました"}',
        ),
      );

      const result = await service.processCommand('明日までで', {
        action: 'create_task',
        collected_params: { title: 'レポート作成' },
      });

      expect(result.action).toBe('create_task');
      expect(result.needs_followup).toBe(false);
      expect(result.final_params).toMatchObject({ title: 'レポート作成' });
      expect(result.reply).toBe('レポート作成タスクを登録しました');
    });

    it('create_event フォローアップで終了時刻を収集する', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse(
          '{"collected_params":{"title":"ミーティング","start_at":"2026-08-24T06:00:00.000Z","end_at":"2026-08-24T07:00:00.000Z"},"needs_followup":false,"reply":"ミーティングを登録しました"}',
        ),
      );

      const result = await service.processCommand('午後4時まで', {
        action: 'create_event',
        collected_params: {
          title: 'ミーティング',
          start_at: '2026-08-24T06:00:00.000Z',
        },
      });

      expect(result.action).toBe('create_event');
      expect(result.needs_followup).toBe(false);
      expect(result.final_params).toMatchObject({
        title: 'ミーティング',
        end_at: '2026-08-24T07:00:00.000Z',
      });
    });

    it('フォローアップでキャンセル意図を検出した場合は cancel アクションを返す', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse(
          '{"collected_params":{},"needs_followup":false,"reply":"キャンセルしました","cancelled":true}',
        ),
      );

      const result = await service.processCommand('キャンセル', {
        action: 'create_task',
        collected_params: { title: 'レポート作成' },
      });

      expect(result.action).toBe('cancel');
      expect(result.needs_followup).toBe(false);
      expect(result.reply).toBe('キャンセルしました');
    });

    it('フォローアップで needs_followup: true の場合は引き続き質問を返す', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse(
          '{"collected_params":{},"needs_followup":true,"reply":"タスクのタイトルを教えてください"}',
        ),
      );

      const result = await service.processCommand('タスクを追加して', {
        action: 'create_task',
        collected_params: {},
      });

      expect(result.action).toBe('create_task');
      expect(result.needs_followup).toBe(true);
      expect(result.final_params).toBeUndefined();
    });

    it('フォローアップのJSONパース失敗時は unknown を返す', async () => {
      mockCreate.mockResolvedValue(
        makeAnthropicResponse('パースできないテキスト'),
      );

      const result = await service.processCommand('明日まで', {
        action: 'create_task',
        collected_params: { title: 'レポート作成' },
      });

      expect(result.action).toBe('unknown');
      expect(result.needs_followup).toBe(false);
    });
  });

  describe('shouldCutoffFollowup', () => {
    it('MAX_FOLLOWUP_ROUNDS（2）以上でカットオフする', () => {
      expect(service.shouldCutoffFollowup(0)).toBe(false);
      expect(service.shouldCutoffFollowup(1)).toBe(false);
      expect(service.shouldCutoffFollowup(2)).toBe(true);
      expect(service.shouldCutoffFollowup(3)).toBe(true);
    });
  });
});
