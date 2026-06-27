import {
  IsString,
  IsNotEmpty,
  IsDateString,
  MaxLength,
  IsOptional,
} from 'class-validator';

/** 予定作成リクエストDTO */
export class CreateEventDto {
  /** 予定タイトル */
  @IsString()
  @IsNotEmpty({ message: 'タイトルを入力してください' })
  @MaxLength(200, { message: 'タイトルは200文字以内で入力してください' })
  title: string;

  /** 予定の説明文 */
  @IsString()
  @MaxLength(1000, { message: '説明文は1000文字以内で入力してください' })
  @IsOptional()
  description?: string;

  /** 開始日時（ISO8601形式） */
  @IsDateString({}, { message: '正しい日時形式で入力してください' })
  start_at: string;

  /** 終了日時（ISO8601形式） */
  @IsDateString({}, { message: '正しい日時形式で入力してください' })
  end_at: string;
}

/** 予定更新リクエストDTO */
export class UpdateEventDto {
  /** 予定タイトル */
  @IsString()
  @IsNotEmpty({ message: 'タイトルを入力してください' })
  @MaxLength(200, { message: 'タイトルは200文字以内で入力してください' })
  @IsOptional()
  title?: string;

  /** 予定の説明文 */
  @IsString()
  @MaxLength(1000, { message: '説明文は1000文字以内で入力してください' })
  @IsOptional()
  description?: string;

  /** 開始日時（ISO8601形式） */
  @IsDateString({}, { message: '正しい日時形式で入力してください' })
  @IsOptional()
  start_at?: string;

  /** 終了日時（ISO8601形式） */
  @IsDateString({}, { message: '正しい日時形式で入力してください' })
  @IsOptional()
  end_at?: string;
}

/** 予定レスポンスDTO */
export interface EventResponseDto {
  id: number;
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
