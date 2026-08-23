import { logger } from '../logger';

const { REACT_APP_API_SCHEME, REACT_APP_API_HOST, REACT_APP_API_PORT } = process.env;
const API_BASE = REACT_APP_API_HOST
  ? `${REACT_APP_API_SCHEME}://${REACT_APP_API_HOST}:${REACT_APP_API_PORT}`
  : '';
const CONTEXT = 'voiceApi';

/** アクション種別 */
export type VoiceActionType =
  | 'navigate'
  | 'create_task'
  | 'complete_task'
  | 'create_event'
  | 'cancel'
  | 'unknown';

/** 音声コマンド解析結果 */
export interface VoiceCommandResponse {
  action: VoiceActionType;
  params: Record<string, unknown>;
  reply: string;
  /** さらに追加情報のヒアリングが必要かどうか */
  needs_followup: boolean;
  /** 現時点での収集済みパラメーター（needs_followup: true のとき） */
  collected_params?: Record<string, unknown>;
  /** 登録に使う最終パラメーター（needs_followup: false かつ create_task/create_event のとき） */
  final_params?: Record<string, unknown>;
}

/** フォローアップコンテキスト */
export interface VoiceFollowupContext {
  action: string;
  collected_params: Record<string, unknown>;
}

/**
 * 認証ヘッダーを構築する
 */
function authHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/**
 * 音声認識テキストをバックエンドに送信してアクションを取得する。
 * context が指定された場合はフォローアップとして送信する
 */
export async function sendVoiceCommand(
  text: string,
  context?: VoiceFollowupContext,
): Promise<VoiceCommandResponse> {
  logger.info(CONTEXT, `音声コマンド送信: "${text}" hasContext=${!!context}`);

  const response = await fetch(`${API_BASE}/voice/command`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ text, context }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = (data as { message?: string }).message || '音声コマンドの解析に失敗しました。';
    logger.warn(CONTEXT, `音声コマンド送信失敗: ${message}`);
    throw new Error(message);
  }

  logger.info(CONTEXT, '音声コマンド送信成功');
  return (await response.json()) as VoiceCommandResponse;
}
