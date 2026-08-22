import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/** フォローアップコンテキストDTO（2回目以降のリクエストで使用） */
export class VoiceFollowupContextDto {
  /** 前回解析されたアクション種別 */
  @ApiProperty({
    description: '前回解析されたアクション種別',
    example: 'create_task',
  })
  @IsString()
  @IsNotEmpty()
  action: string;

  /** 収集済みパラメーター */
  @ApiProperty({
    description: '収集済みパラメーター',
    example: { title: 'レポート作成' },
  })
  @IsObject()
  collected_params: Record<string, unknown>;
}

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

  /**
   * フォローアップコンテキスト（2回目以降のリクエストで送信）。
   * 前回のアクションと収集済みパラメーターを含む
   */
  @ApiPropertyOptional({
    description: 'フォローアップコンテキスト（2回目以降に指定）',
    type: VoiceFollowupContextDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => VoiceFollowupContextDto)
  context?: VoiceFollowupContextDto;
}

/** アクション種別 */
export type VoiceActionType =
  | 'navigate'
  | 'create_task'
  | 'complete_task'
  | 'create_event'
  | 'cancel'
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
  /** さらに追加情報のヒアリングが必要かどうか（create_task/create_event のみ使用） */
  needs_followup: boolean;
  /** 現時点での収集済みパラメーター（フロントが次回リクエストに含めて返す） */
  collected_params?: Record<string, unknown>;
  /** 登録に使う最終パラメーター（needs_followup: false かつ create_task/create_event のとき） */
  final_params?: Record<string, unknown>;
}
