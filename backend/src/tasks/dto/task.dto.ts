import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsArray,
  IsOptional,
  MaxLength,
  ArrayMaxSize,
  IsIn,
  IsInt,
  IsPositive,
  IsBoolean,
} from 'class-validator';

/** 優先度の有効値 */
export const PRIORITY_VALUES = ['HIGH', 'MEDIUM', 'LOW'] as const;
/** 優先度の型 */
export type Priority = (typeof PRIORITY_VALUES)[number];

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
  assignees?: string[];

  /** 優先度（HIGH/MEDIUM/LOW） */
  @IsIn(PRIORITY_VALUES, {
    message: '優先度はHIGH・MEDIUM・LOWのいずれかを指定してください',
  })
  @IsOptional()
  priority?: Priority;

  /** カテゴリ（分類） */
  @IsString()
  @MaxLength(100, { message: 'カテゴリは100文字以内で入力してください' })
  @IsOptional()
  category?: string;

  /** 親タスクID（子タスク作成時に指定） */
  @IsInt({ message: '親タスクIDは整数で指定してください' })
  @IsPositive({ message: '親タスクIDは正の整数で指定してください' })
  @IsOptional()
  parent_id?: number;

  /** 作成者ユーザー名 */
  @IsString()
  @IsNotEmpty({ message: '作成者を指定してください' })
  created_by: string;
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

  /** 優先度（HIGH/MEDIUM/LOW） */
  @IsIn(PRIORITY_VALUES, {
    message: '優先度はHIGH・MEDIUM・LOWのいずれかを指定してください',
  })
  @IsOptional()
  priority?: Priority;

  /** カテゴリ（分類） */
  @IsString()
  @MaxLength(100, { message: 'カテゴリは100文字以内で入力してください' })
  @IsOptional()
  category?: string;

  /** 親タスクID */
  @IsInt({ message: '親タスクIDは整数で指定してください' })
  @IsPositive({ message: '親タスクIDは正の整数で指定してください' })
  @IsOptional()
  parent_id?: number;

  /** 完了状態（true: 完了 / false: 未完了） */
  @IsBoolean({ message: '完了状態はtrue/falseで指定してください' })
  @IsOptional()
  is_completed?: boolean;
}

/** 通知作成リクエストDTO */
export class CreateNotificationDto {
  /** 通知日時（ISO8601形式） */
  @IsDateString({}, { message: '正しい日時形式で入力してください' })
  notify_at: string;
}

/** 通知レスポンスDTO */
export interface NotificationResponseDto {
  /** 通知ID */
  id: number;
  /** タスクID */
  task_id: number;
  /** 通知日時（ISO8601形式） */
  notify_at: string;
  /** 送信済みフラグ */
  is_sent: boolean;
}

/** タスクレスポンスDTO */
export interface TaskResponseDto {
  id: number;
  title: string;
  description: string;
  due_date: string;
  priority: Priority;
  category: string | null;
  parent_id: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_completed: boolean;
  /** タスクをクローズ（完了）したユーザー名。未完了の場合はnull */
  closed_by: string | null;
  assignees: string[];
  children: TaskResponseDto[];
  /** タスクに設定された通知一覧 */
  notifications: NotificationResponseDto[];
}
