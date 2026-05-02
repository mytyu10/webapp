import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsArray,
  IsOptional,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';

/** タスク作成リクエストDTO */
export class CreateTaskDto {
  /** タスクタイトル */
  @IsString()
  @IsNotEmpty({ message: 'タイトルを入力してください' })
  @MaxLength(200, { message: 'タイトルは200文字以内で入力してください' })
  title: string;

  /** タスク説明文 */
  @IsString()
  @IsNotEmpty({ message: '説明文を入力してください' })
  @MaxLength(1000, { message: '説明文は1000文字以内で入力してください' })
  description: string;

  /** タスク期限（ISO8601形式） */
  @IsDateString({}, { message: '正しい日時形式で入力してください' })
  due_date: string;

  /** 担当者ユーザー名リスト */
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50, { message: '担当者は50人以内で設定してください' })
  @IsOptional()
  assignees: string[];
}

/** タスク更新リクエストDTO */
export class UpdateTaskDto {
  /** タスクタイトル */
  @IsString()
  @IsNotEmpty({ message: 'タイトルを入力してください' })
  @MaxLength(200, { message: 'タイトルは200文字以内で入力してください' })
  @IsOptional()
  title?: string;

  /** タスク説明文 */
  @IsString()
  @IsNotEmpty({ message: '説明文を入力してください' })
  @MaxLength(1000, { message: '説明文は1000文字以内で入力してください' })
  @IsOptional()
  description?: string;

  /** タスク期限（ISO8601形式） */
  @IsDateString({}, { message: '正しい日時形式で入力してください' })
  @IsOptional()
  due_date?: string;

  /** 担当者ユーザー名リスト */
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50, { message: '担当者は50人以内で設定してください' })
  @IsOptional()
  assignees?: string[];
}

/** タスクレスポンスDTO */
export interface TaskResponseDto {
  id: number;
  title: string;
  description: string;
  due_date: string;
  created_at: string;
  updated_at: string;
  assignees: string[];
}
