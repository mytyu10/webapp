import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** 音声コマンドリクエストDTO */
export class VoiceCommandRequestDto {
  /** 音声認識されたテキスト */
  @ApiProperty({
    description: '音声認識されたテキスト（500文字以内）',
    example: 'タスク管理画面を開いて',
  })
  @IsString()
  @IsNotEmpty({ message: 'テキストを入力してください' })
  @MaxLength(500, { message: 'テキストは500文字以内で入力してください' })
  text: string;
}

/** アクション種別 */
export type VoiceActionType =
  | 'navigate'
  | 'create_task'
  | 'complete_task'
  | 'create_event'
  | 'unknown';

/** navigate アクションのパラメーター */
export interface NavigateParams {
  path: '/tasks' | '/calendar' | '/links' | '/chat' | '/profile';
}

/** create_task アクションのパラメーター */
export interface CreateTaskParams {
  title: string;
  description?: string;
  due_date?: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
}

/** complete_task アクションのパラメーター */
export interface CompleteTaskParams {
  title: string;
}

/** create_event アクションのパラメーター */
export interface CreateEventParams {
  title: string;
  start_at: string;
  end_at?: string;
  description?: string;
}

/** 音声コマンド解析結果 */
export interface VoiceCommandResult {
  action: VoiceActionType;
  params:
    | NavigateParams
    | CreateTaskParams
    | CompleteTaskParams
    | CreateEventParams
    | Record<string, never>;
  reply: string;
}
