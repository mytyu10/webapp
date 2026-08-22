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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 優先度の有効値 */
export const PRIORITY_VALUES = ['HIGH', 'MEDIUM', 'LOW'] as const;
/** 優先度の型 */
export type Priority = (typeof PRIORITY_VALUES)[number];

/** タスク作成リクエストDTO */
export class CreateTaskDto {
  /** タスクタイトル */
  @ApiProperty({
    description: 'タスクタイトル（200文字以内）',
    example: 'レポートを作成する',
  })
  @IsString()
  @IsNotEmpty({ message: 'タイトルを入力してください' })
  @MaxLength(200, { message: 'タイトルは200文字以内で入力してください' })
  title: string;

  /** タスク説明文 */
  @ApiPropertyOptional({
    description: 'タスク説明文（1000文字以内）',
    example: '月次レポートの作成と提出',
  })
  @IsString()
  @MaxLength(1000, { message: '説明文は1000文字以内で入力してください' })
  @IsOptional()
  description?: string;

  /** タスク期限（ISO8601形式） */
  @ApiPropertyOptional({
    description: 'タスク期限（ISO8601形式）',
    example: '2026-08-01T12:00:00.000Z',
  })
  @IsDateString({}, { message: '正しい日時形式で入力してください' })
  @IsOptional()
  due_date?: string;

  /** 担当者ユーザー名リスト */
  @ApiPropertyOptional({
    description: '担当者ユーザー名リスト（50人以内）',
    example: ['alice', 'bob'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50, { message: '担当者は50人以内で設定してください' })
  @IsOptional()
  assignees?: string[];

  /** 優先度（HIGH/MEDIUM/LOW） */
  @ApiPropertyOptional({
    description: '優先度',
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    example: 'HIGH',
  })
  @IsIn(PRIORITY_VALUES, {
    message: '優先度はHIGH・MEDIUM・LOWのいずれかを指定してください',
  })
  @IsOptional()
  priority?: Priority;

  /** カテゴリ（分類） */
  @ApiPropertyOptional({
    description: 'カテゴリ（100文字以内）',
    example: '業務',
  })
  @IsString()
  @MaxLength(100, { message: 'カテゴリは100文字以内で入力してください' })
  @IsOptional()
  category?: string;

  /** 親タスクID（子タスク作成時に指定） */
  @ApiPropertyOptional({
    description: '親タスクID（子タスク作成時に指定）',
    example: 1,
  })
  @IsInt({ message: '親タスクIDは整数で指定してください' })
  @IsPositive({ message: '親タスクIDは正の整数で指定してください' })
  @IsOptional()
  parent_id?: number;
}

/** タスク更新リクエストDTO */
export class UpdateTaskDto {
  /** タスクタイトル */
  @ApiPropertyOptional({
    description: 'タスクタイトル（200文字以内）',
    example: '更新されたタイトル',
  })
  @IsString()
  @IsNotEmpty({ message: 'タイトルを入力してください' })
  @MaxLength(200, { message: 'タイトルは200文字以内で入力してください' })
  @IsOptional()
  title?: string;

  /** タスク説明文 */
  @ApiPropertyOptional({ description: 'タスク説明文（1000文字以内）' })
  @IsString()
  @IsNotEmpty({ message: '説明文を入力してください' })
  @MaxLength(1000, { message: '説明文は1000文字以内で入力してください' })
  @IsOptional()
  description?: string;

  /** タスク期限（ISO8601形式） */
  @ApiPropertyOptional({
    description: 'タスク期限（ISO8601形式）',
    example: '2026-08-01T12:00:00.000Z',
  })
  @IsDateString({}, { message: '正しい日時形式で入力してください' })
  @IsOptional()
  due_date?: string;

  /** 担当者ユーザー名リスト */
  @ApiPropertyOptional({
    description: '担当者ユーザー名リスト',
    example: ['alice'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50, { message: '担当者は50人以内で設定してください' })
  @IsOptional()
  assignees?: string[];

  /** 優先度（HIGH/MEDIUM/LOW） */
  @ApiPropertyOptional({
    description: '優先度',
    enum: ['HIGH', 'MEDIUM', 'LOW'],
  })
  @IsIn(PRIORITY_VALUES, {
    message: '優先度はHIGH・MEDIUM・LOWのいずれかを指定してください',
  })
  @IsOptional()
  priority?: Priority;

  /** カテゴリ（分類） */
  @ApiPropertyOptional({ description: 'カテゴリ（100文字以内）' })
  @IsString()
  @MaxLength(100, { message: 'カテゴリは100文字以内で入力してください' })
  @IsOptional()
  category?: string;

  /** 親タスクID */
  @ApiPropertyOptional({ description: '親タスクID', example: 1 })
  @IsInt({ message: '親タスクIDは整数で指定してください' })
  @IsPositive({ message: '親タスクIDは正の整数で指定してください' })
  @IsOptional()
  parent_id?: number;

  /** 完了状態（true: 完了 / false: 未完了） */
  @ApiPropertyOptional({ description: '完了状態', example: true })
  @IsBoolean({ message: '完了状態はtrue/falseで指定してください' })
  @IsOptional()
  is_completed?: boolean;
}

/** タスクレスポンスDTO */
export interface TaskResponseDto {
  id: number;
  title: string;
  description: string;
  due_date: string | null;
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
}
