import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';
import type { VoiceCommandResult } from '../dto/voice.dto';

const CONTEXT = 'VoiceService';

/** Claude に渡すシステムプロンプト */
const SYSTEM_PROMPT = `あなたは日本語の音声コマンドを解析するアシスタントです。
ユーザーの発話を解析し、以下のJSON形式のみを返してください。説明文やコードブロックは不要です。

{
  "action": "<アクション種別>",
  "params": { <パラメーター> }
}

アクション種別と対応するパラメーター:

1. navigate - 画面遷移
   params: { "path": "/tasks" | "/calendar" | "/links" | "/chat" | "/profile" }
   例: 「タスク管理を開いて」→ { "action": "navigate", "params": { "path": "/tasks" } }
   例: 「カレンダーへ移動」→ { "action": "navigate", "params": { "path": "/calendar" } }
   例: 「リンク集を見せて」→ { "action": "navigate", "params": { "path": "/links" } }
   例: 「チャットを開いて」→ { "action": "navigate", "params": { "path": "/chat" } }
   例: 「プロフィールへ」→ { "action": "navigate", "params": { "path": "/profile" } }

2. create_task - タスク作成
   params: { "title": "タスク名", "description": "説明（省略可）", "due_date": "ISO8601形式（省略可）", "priority": "HIGH"|"MEDIUM"|"LOW"（省略可） }
   例: 「明日までにレポートを作成するタスクを追加して」→ { "action": "create_task", "params": { "title": "レポートを作成する", "due_date": "<明日の日付をISO8601で>" } }
   due_date は「明日」「来週」などの相対表現を具体的な日付（UTC）に変換してください。

3. complete_task - タスク完了
   params: { "title": "タスク名の一部または全体" }
   例: 「レポートのタスクを完了にして」→ { "action": "complete_task", "params": { "title": "レポート" } }

4. create_event - 予定作成
   params: { "title": "予定名", "start_at": "ISO8601形式", "end_at": "ISO8601形式（省略可）", "description": "説明（省略可）" }
   例: 「明日の午後3時にミーティングを追加して」→ { "action": "create_event", "params": { "title": "ミーティング", "start_at": "<明日15:00のISO8601>", "end_at": "<明日16:00のISO8601>" } }

5. unknown - 認識できなかった場合
   params: {}

コマンドが上記のいずれにも当てはまらない場合は unknown を返してください。
必ずJSONのみを返し、マークダウンのコードブロック（\`\`\`）は使用しないでください。`;

@Injectable()
export class VoiceService {
  private readonly anthropic: Anthropic;

  constructor(private readonly logger: LoggerService) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * 音声認識テキストをClaude APIで解析し、実行すべきアクションを返す
   */
  async processCommand(text: string): Promise<VoiceCommandResult> {
    this.logger.log(CONTEXT, `音声コマンド解析開始: "${text}"`);

    try {
      const currentDate = new Date().toISOString();
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `現在日時: ${currentDate}\n\n音声コマンド: ${text}`,
          },
        ],
      });

      const rawText = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as { type: 'text'; text: string }).text)
        .join('');

      this.logger.log(CONTEXT, `Claude応答: ${rawText}`);

      const result = this.parseClaudeResponse(rawText);
      this.logger.log(CONTEXT, `音声コマンド解析完了: action=${result.action}`);
      return result;
    } catch (error) {
      this.logger.error(CONTEXT, `音声コマンド解析失敗: ${String(error)}`);
      throw new InternalServerErrorException(MESSAGE.VOICE.COMMAND_FAILED);
    }
  }

  /**
   * Claude のレスポンステキストから JSON を抽出してパースする。
   * パース失敗時は unknown アクションを返す
   */
  private parseClaudeResponse(text: string): VoiceCommandResult {
    // コードブロック記法の除去
    const cleaned = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    // JSON 部分を抽出（最初の { から最後の } まで）
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      this.logger.warn(CONTEXT, 'JSON が見つかりませんでした');
      return { action: 'unknown', params: {} };
    }

    const jsonStr = cleaned.slice(jsonStart, jsonEnd + 1);

    try {
      const parsed = JSON.parse(jsonStr) as {
        action?: string;
        params?: Record<string, unknown>;
      };

      const action = parsed.action as VoiceCommandResult['action'];
      const params = parsed.params ?? {};

      const validActions: VoiceCommandResult['action'][] = [
        'navigate',
        'create_task',
        'complete_task',
        'create_event',
        'unknown',
      ];

      if (!validActions.includes(action)) {
        this.logger.warn(CONTEXT, `不明なアクション: ${String(parsed.action)}`);
        return { action: 'unknown', params: {} };
      }

      return { action, params } as VoiceCommandResult;
    } catch (parseError) {
      this.logger.warn(CONTEXT, `JSONパース失敗: ${String(parseError)}`);
      return { action: 'unknown', params: {} };
    }
  }
}
