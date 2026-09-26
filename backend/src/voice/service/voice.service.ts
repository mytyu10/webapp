import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';
import type {
  VoiceCommandResult,
  VoiceFollowupContextDto,
} from '../dto/voice.dto';

const CONTEXT = 'VoiceService';

const JST_OFFSET_HOURS = 9;
const MINUTES_PER_HOUR = 60;
const MS_PER_MINUTE = 60 * 1000;
const JST_OFFSET_MS = JST_OFFSET_HOURS * MINUTES_PER_HOUR * MS_PER_MINUTE;

/** フォローアップの最大往復回数 */
const MAX_FOLLOWUP_ROUNDS = 2;

/** Claude に渡すシステムプロンプト（初回） */
const SYSTEM_PROMPT = `あなたは日本語の音声コマンドを解析するアシスタントです。
ユーザーの発話を解析し、以下のJSON形式のみを返してください。説明文やコードブロックは不要です。

{
  "action": "<アクション種別>",
  "params": { <パラメーター> },
  "reply": "<ユーザーへの完了報告または質問（日本語・1文・40文字以内）>",
  "needs_followup": <true|false>,
  "collected_params": { <現時点での収集済みパラメーター> }
}

アクション種別と対応するパラメーター:

1. navigate - 画面遷移
   params: { "path": "/tasks" | "/calendar" | "/links" | "/chat" | "/profile" }
   needs_followup: false
   例: 「タスク管理を開いて」→ { "action": "navigate", "params": { "path": "/tasks" }, "reply": "タスク管理画面に移動します", "needs_followup": false, "collected_params": {} }

2. create_task - タスク作成
   params: { "title": "タスク名", "description": "説明（省略可）", "due_date": "ISO8601形式（省略可）", "priority": "HIGH"|"MEDIUM"|"LOW"（省略可） }
   titleが取得できた場合: needs_followup: true で期限・優先度を1回だけ質問する。
   titleが取得できなかった場合: needs_followup: true でタイトルを質問する。
   due_date は「明日」「来週」などの相対表現を具体的な日付（UTC）に変換してください。
   例（タイトルあり）: 「レポートを作成するタスクを追加して」→ { "action": "create_task", "params": {}, "reply": "期限と優先度はありますか？（なければ「なし」と言ってください）", "needs_followup": true, "collected_params": { "title": "レポートを作成する" } }
   例（タイトルなし）: 「タスクを追加して」→ { "action": "create_task", "params": {}, "reply": "タスクのタイトルを教えてください", "needs_followup": true, "collected_params": {} }

3. complete_task - タスク完了
   params: { "title": "タスク名の一部または全体" }
   needs_followup: false
   例: 「レポートのタスクを完了にして」→ { "action": "complete_task", "params": { "title": "レポート" }, "reply": "タスクを完了にします", "needs_followup": false, "collected_params": {} }

4. create_event - 予定作成
   params: { "title": "予定名", "start_at": "ISO8601形式", "end_at": "ISO8601形式（省略可）", "description": "説明（省略可）" }
   titleとstart_atが取得できた場合: needs_followup: true で終了時刻・説明を1回だけ質問する。
   titleまたはstart_atが取得できなかった場合: needs_followup: true で不足情報を質問する。
   例（タイトル・開始日時あり）: 「明日の午後3時にミーティングを追加して」→ { "action": "create_event", "params": {}, "reply": "終了時刻はありますか？（なければ「なし」と言ってください）", "needs_followup": true, "collected_params": { "title": "ミーティング", "start_at": "<ISO8601>" } }

5. unknown - 認識できなかった場合
   params: {}
   needs_followup: false

コマンドが上記のいずれにも当てはまらない場合は unknown を返してください。
必ずJSONのみを返し、マークダウンのコードブロック（\`\`\`）は使用しないでください。`;

/** フォローアップ用システムプロンプト */
const FOLLOWUP_SYSTEM_PROMPT = `あなたは日本語の音声コマンドを解析するアシスタントです。
前回のアクションと収集済みパラメーターをもとに、ユーザーの追加発話から情報を抽出してください。
以下のJSON形式のみを返してください。説明文やコードブロックは不要です。

{
  "collected_params": { <すべての収集済みパラメーターをマージしたもの> },
  "needs_followup": <true|false>,
  "reply": "<ユーザーへの返答（日本語・1文・40文字以内）>"
}

ユーザーが「キャンセル」「やめる」「中止」「いらない」「なし」「スキップ」「登録しないで」などキャンセル意図を示した場合:
{ "collected_params": {}, "needs_followup": false, "reply": "キャンセルしました", "cancelled": true }

create_task の場合:
- title が collected_params に含まれていれば登録可能（needs_followup: false）
- title がなければ質問を続ける（needs_followup: true）
- due_date は「明日」「来週」などの相対表現を具体的な日付（UTC）に変換する
- priority は HIGH / MEDIUM / LOW のいずれかのみ有効
- 「なし」「ありません」「スキップ」などはそのフィールドを省略してよい

create_event の場合:
- title と start_at が collected_params に含まれていれば登録可能（needs_followup: false）
- 不足していれば質問を続ける（needs_followup: true）
- 「なし」「ありません」「スキップ」などはそのフィールドを省略してよい

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
   * 音声認識テキストをClaude APIで解析し、実行すべきアクションを返す。
   * context が指定された場合はフォローアップ（2回目以降）として処理する
   */
  async processCommand(
    text: string,
    followupContext?: VoiceFollowupContextDto,
  ): Promise<VoiceCommandResult> {
    this.logger.log(
      CONTEXT,
      `音声コマンド解析開始: "${text}" context=${JSON.stringify(followupContext ?? null)}`,
    );

    try {
      if (followupContext) {
        return await this.processFollowup(text, followupContext);
      }
      return await this.processInitial(text);
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error(CONTEXT, `音声コマンド解析失敗: ${String(error)}`);
      throw new InternalServerErrorException(MESSAGE.VOICE.COMMAND_FAILED);
    }
  }

  /**
   * 初回コマンド解析
   */
  private async processInitial(text: string): Promise<VoiceCommandResult> {
    const jstDateStr = this.getJstDateStr();
    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `現在日時(JST): ${jstDateStr}\nタイムゾーン: Asia/Tokyo (UTC+9)\nユーザーが指定する時刻はJSTです。ISO8601のstart_at/end_at/due_dateはUTCに変換して出力してください。\n\n音声コマンド: ${text}`,
        },
      ],
    });

    const rawText = this.extractText(response);
    this.logger.log(CONTEXT, `Claude応答(初回): ${rawText}`);

    const result = this.parseInitialResponse(rawText);
    this.logger.log(
      CONTEXT,
      `音声コマンド解析完了: action=${result.action} needs_followup=${result.needs_followup}`,
    );
    return result;
  }

  /**
   * フォローアップコマンド解析（2回目以降）
   */
  private async processFollowup(
    text: string,
    context: VoiceFollowupContextDto,
  ): Promise<VoiceCommandResult> {
    const jstDateStr = this.getJstDateStr();
    const userContent =
      `現在日時(JST): ${jstDateStr}\n` +
      `タイムゾーン: Asia/Tokyo (UTC+9)\n` +
      `前回のアクション: ${context.action}\n` +
      `収集済みパラメーター: ${JSON.stringify(context.collected_params)}\n` +
      `ユーザーの追加発話: ${text}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: FOLLOWUP_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    });

    const rawText = this.extractText(response);
    this.logger.log(CONTEXT, `Claude応答(フォローアップ): ${rawText}`);

    const result = this.parseFollowupResponse(rawText, context.action);
    this.logger.log(
      CONTEXT,
      `フォローアップ解析完了: needs_followup=${result.needs_followup}`,
    );
    return result;
  }

  /**
   * 初回レスポンスのJSONをパースして VoiceCommandResult に変換する
   */
  private parseInitialResponse(text: string): VoiceCommandResult {
    const cleaned = this.cleanJson(text);
    const jsonStr = this.extractJsonString(cleaned);

    if (!jsonStr) {
      this.logger.warn(CONTEXT, 'JSON が見つかりませんでした（初回）');
      return this.unknownResult();
    }

    try {
      const parsed = JSON.parse(jsonStr) as {
        action?: string;
        params?: Record<string, unknown>;
        reply?: string;
        needs_followup?: boolean;
        collected_params?: Record<string, unknown>;
      };

      const action = parsed.action as VoiceCommandResult['action'];
      const validActions: VoiceCommandResult['action'][] = [
        'navigate',
        'create_task',
        'complete_task',
        'create_event',
        'cancel',
        'unknown',
      ];

      if (!validActions.includes(action)) {
        this.logger.warn(CONTEXT, `不明なアクション: ${String(parsed.action)}`);
        return this.unknownResult();
      }

      const needsFollowup = parsed.needs_followup ?? false;
      const collectedParams = parsed.collected_params ?? {};
      const params = needsFollowup ? {} : (parsed.params ?? {});

      return {
        action,
        params: params as VoiceCommandResult['params'],
        reply: parsed.reply ?? '',
        needs_followup: needsFollowup,
        collected_params: collectedParams,
      };
    } catch (parseError) {
      this.logger.warn(CONTEXT, `JSONパース失敗(初回): ${String(parseError)}`);
      return this.unknownResult();
    }
  }

  /**
   * フォローアップレスポンスのJSONをパースして VoiceCommandResult に変換する
   */
  private parseFollowupResponse(
    text: string,
    originalAction: string,
  ): VoiceCommandResult {
    const cleaned = this.cleanJson(text);
    const jsonStr = this.extractJsonString(cleaned);

    if (!jsonStr) {
      this.logger.warn(
        CONTEXT,
        'JSON が見つかりませんでした（フォローアップ）',
      );
      return this.unknownResult();
    }

    try {
      const parsed = JSON.parse(jsonStr) as {
        collected_params?: Record<string, unknown>;
        needs_followup?: boolean;
        reply?: string;
        cancelled?: boolean;
      };

      // キャンセル検出
      if (parsed.cancelled) {
        return {
          action: 'cancel',
          params: {} as Record<string, never>,
          reply: parsed.reply ?? 'キャンセルしました',
          needs_followup: false,
        };
      }

      const collectedParams = parsed.collected_params ?? {};
      const needsFollowup = parsed.needs_followup ?? false;
      const action = originalAction as VoiceCommandResult['action'];

      // needs_followup: false のとき final_params を設定
      const finalParams = needsFollowup ? undefined : collectedParams;

      return {
        action,
        params: {} as Record<string, never>,
        reply: parsed.reply ?? '',
        needs_followup: needsFollowup,
        collected_params: collectedParams,
        final_params: finalParams,
      };
    } catch (parseError) {
      this.logger.warn(
        CONTEXT,
        `JSONパース失敗(フォローアップ): ${String(parseError)}`,
      );
      return this.unknownResult();
    }
  }

  /** JST の現在日時文字列を返す */
  private getJstDateStr(): string {
    const now = new Date();
    const jstDate = new Date(now.getTime() + JST_OFFSET_MS);
    return jstDate.toISOString().replace('Z', '+09:00');
  }

  /** Anthropic レスポンスからテキストを抽出する */
  private extractText(response: Anthropic.Message): string {
    return response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as { type: 'text'; text: string }).text)
      .join('');
  }

  /** コードブロック記法を除去する */
  private cleanJson(text: string): string {
    return text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
  }

  /** テキストから最初の JSON オブジェクト文字列を抽出する */
  private extractJsonString(text: string): string | null {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) return null;
    return text.slice(jsonStart, jsonEnd + 1);
  }

  /** unknown アクションの結果を返す */
  private unknownResult(): VoiceCommandResult {
    return {
      action: 'unknown',
      params: {} as Record<string, never>,
      reply: '',
      needs_followup: false,
    };
  }

  /**
   * フォローアップラウンド数の上限チェック。
   * MAX_FOLLOWUP_ROUNDS に達した場合は needs_followup: false として打ち切る
   */
  shouldCutoffFollowup(round: number): boolean {
    return round >= MAX_FOLLOWUP_ROUNDS;
  }
}
