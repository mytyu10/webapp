import {
  IsString,
  IsNotEmpty,
  IsDateString,
  MaxLength,
  IsOptional,
  IsArray,
  ArrayMinSize,
  IsInt,
  Min,
  Max,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 繰り返しタイプ */
export enum RepeatType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

/** 繰り返しルールDTO */
export class RepeatRuleDto {
  /** 繰り返しタイプ（daily: 毎日, weekly: 毎週, monthly: 毎月） */
  @ApiProperty({
    description: '繰り返しタイプ',
    enum: RepeatType,
    example: 'daily',
  })
  @IsEnum(RepeatType, {
    message:
      '繰り返しタイプは daily / weekly / monthly のいずれかで指定してください',
  })
  type: RepeatType;

  /** 繰り返し間隔（例: 2 の場合は毎2日・毎2週・毎2ヶ月） */
  @ApiProperty({ description: '繰り返し間隔（1〜99）', example: 1 })
  @IsInt({ message: '繰り返し間隔は整数で指定してください' })
  @Min(1, { message: '繰り返し間隔は1以上で指定してください' })
  @Max(99, { message: '繰り返し間隔は99以下で指定してください' })
  interval: number;

  /**
   * 対象曜日（0=日, 1=月, ..., 6=土）。type が weekly の場合のみ有効。
   * 未指定の場合は start_at の曜日を使用する
   */
  @ApiPropertyOptional({
    description: '対象曜日（0=日〜6=土）。weekly の場合のみ有効',
    example: [1, 3],
  })
  @IsArray({ message: '曜日は配列で指定してください' })
  @IsInt({ each: true, message: '曜日は0〜6の整数で指定してください' })
  @Min(0, { each: true, message: '曜日は0〜6の整数で指定してください' })
  @Max(6, { each: true, message: '曜日は0〜6の整数で指定してください' })
  @IsOptional()
  days_of_week?: number[];

  /** 繰り返し終了日（ISO8601形式）。count と排他的に使用する */
  @ApiPropertyOptional({
    description: '繰り返し終了日（ISO8601形式）',
    example: '2026-12-31T00:00:00.000Z',
  })
  @IsDateString({}, { message: '終了日は正しい日時形式で入力してください' })
  @IsOptional()
  end_date?: string;

  /** 繰り返し回数。end_date と排他的に使用する */
  @ApiPropertyOptional({ description: '繰り返し回数（1〜100）', example: 10 })
  @IsInt({ message: '繰り返し回数は整数で指定してください' })
  @Min(1, { message: '繰り返し回数は1以上で指定してください' })
  @Max(100, { message: '繰り返し回数は100以下で指定してください' })
  @IsOptional()
  count?: number;
}

/** 予定作成リクエストDTO */
export class CreateEventDto {
  /** 予定タイトル */
  @ApiProperty({
    description: '予定タイトル（200文字以内）',
    example: 'チームミーティング',
  })
  @IsString()
  @IsNotEmpty({ message: 'タイトルを入力してください' })
  @MaxLength(200, { message: 'タイトルは200文字以内で入力してください' })
  title: string;

  /** 予定の説明文 */
  @ApiPropertyOptional({
    description: '予定の説明文（1000文字以内）',
    example: '週次ミーティング',
  })
  @IsString()
  @MaxLength(1000, { message: '説明文は1000文字以内で入力してください' })
  @IsOptional()
  description?: string;

  /** 開始日時（ISO8601形式） */
  @ApiProperty({
    description: '開始日時（ISO8601形式）',
    example: '2026-08-01T10:00:00.000Z',
  })
  @IsDateString({}, { message: '正しい日時形式で入力してください' })
  start_at: string;

  /** 終了日時（ISO8601形式） */
  @ApiProperty({
    description: '終了日時（ISO8601形式）',
    example: '2026-08-01T11:00:00.000Z',
  })
  @IsDateString({}, { message: '正しい日時形式で入力してください' })
  end_at: string;

  /** 予定の色識別子（cyan/indigo/emerald/violet/rose/amber）。未指定時は cyan */
  @ApiPropertyOptional({
    description: '予定の色識別子',
    enum: ['cyan', 'indigo', 'emerald', 'violet', 'rose', 'amber'],
    example: 'cyan',
  })
  @IsString()
  @IsOptional()
  color?: string;
}

/** 複数日付一括作成リクエストDTO */
export class CreateMultipleEventsDto {
  /** 予定タイトル */
  @ApiProperty({
    description: '予定タイトル（200文字以内）',
    example: '定例会議',
  })
  @IsString()
  @IsNotEmpty({ message: 'タイトルを入力してください' })
  @MaxLength(200, { message: 'タイトルは200文字以内で入力してください' })
  title: string;

  /** 予定の説明文 */
  @ApiPropertyOptional({ description: '予定の説明文（1000文字以内）' })
  @IsString()
  @MaxLength(1000, { message: '説明文は1000文字以内で入力してください' })
  @IsOptional()
  description?: string;

  /** 開始日時の配列（ISO8601形式）。1件以上必須 */
  @ApiProperty({
    description: '開始日時の配列（ISO8601形式）',
    example: ['2026-08-01T10:00:00.000Z'],
  })
  @IsArray({ message: '開始日時は配列で指定してください' })
  @ArrayMinSize(1, { message: '開始日時を1つ以上指定してください' })
  @IsDateString(
    {},
    { each: true, message: '開始日時は正しい日時形式で入力してください' },
  )
  start_times: string[];

  /**
   * 終了日時の配列（ISO8601形式）。start_times と同じ件数必須。
   * 各要素は対応する start_times の要素より後の日時を指定する
   */
  @ApiProperty({
    description: '終了日時の配列（ISO8601形式）',
    example: ['2026-08-01T11:00:00.000Z'],
  })
  @IsArray({ message: '終了日時は配列で指定してください' })
  @ArrayMinSize(1, { message: '終了日時を1つ以上指定してください' })
  @IsDateString(
    {},
    { each: true, message: '終了日時は正しい日時形式で入力してください' },
  )
  end_times: string[];

  /** 予定の色識別子（cyan/indigo/emerald/violet/rose/amber）。未指定時は cyan */
  @ApiPropertyOptional({
    description: '予定の色識別子',
    enum: ['cyan', 'indigo', 'emerald', 'violet', 'rose', 'amber'],
  })
  @IsString()
  @IsOptional()
  color?: string;
}

/** 繰り返し予定作成リクエストDTO */
export class CreateRepeatEventDto {
  /** 予定タイトル */
  @ApiProperty({
    description: '予定タイトル（200文字以内）',
    example: '週次ミーティング',
  })
  @IsString()
  @IsNotEmpty({ message: 'タイトルを入力してください' })
  @MaxLength(200, { message: 'タイトルは200文字以内で入力してください' })
  title: string;

  /** 予定の説明文 */
  @ApiPropertyOptional({ description: '予定の説明文（1000文字以内）' })
  @IsString()
  @MaxLength(1000, { message: '説明文は1000文字以内で入力してください' })
  @IsOptional()
  description?: string;

  /** 繰り返しの最初の開始日時（ISO8601形式） */
  @ApiProperty({
    description: '繰り返しの最初の開始日時（ISO8601形式）',
    example: '2026-08-01T10:00:00.000Z',
  })
  @IsDateString({}, { message: '正しい日時形式で入力してください' })
  start_at: string;

  /**
   * 繰り返しの最初の終了日時（ISO8601形式）。
   * end_at - start_at の差分ミリ秒を保持し、各繰り返し日の end_at を算出する
   */
  @ApiProperty({
    description: '繰り返しの最初の終了日時（ISO8601形式）',
    example: '2026-08-01T11:00:00.000Z',
  })
  @IsDateString({}, { message: '正しい日時形式で入力してください' })
  end_at: string;

  /** 繰り返しルール */
  @ApiProperty({ description: '繰り返しルール', type: RepeatRuleDto })
  @ValidateNested()
  @Type(() => RepeatRuleDto)
  repeat: RepeatRuleDto;

  /** 予定の色識別子（cyan/indigo/emerald/violet/rose/amber）。未指定時は cyan */
  @ApiPropertyOptional({
    description: '予定の色識別子',
    enum: ['cyan', 'indigo', 'emerald', 'violet', 'rose', 'amber'],
  })
  @IsString()
  @IsOptional()
  color?: string;
}

/** 予定更新リクエストDTO */
export class UpdateEventDto {
  /** 予定タイトル */
  @ApiPropertyOptional({ description: '予定タイトル（200文字以内）' })
  @IsString()
  @IsNotEmpty({ message: 'タイトルを入力してください' })
  @MaxLength(200, { message: 'タイトルは200文字以内で入力してください' })
  @IsOptional()
  title?: string;

  /** 予定の説明文 */
  @ApiPropertyOptional({ description: '予定の説明文（1000文字以内）' })
  @IsString()
  @MaxLength(1000, { message: '説明文は1000文字以内で入力してください' })
  @IsOptional()
  description?: string;

  /** 開始日時（ISO8601形式） */
  @ApiPropertyOptional({
    description: '開始日時（ISO8601形式）',
    example: '2026-08-01T10:00:00.000Z',
  })
  @IsDateString({}, { message: '正しい日時形式で入力してください' })
  @IsOptional()
  start_at?: string;

  /** 終了日時（ISO8601形式） */
  @ApiPropertyOptional({
    description: '終了日時（ISO8601形式）',
    example: '2026-08-01T11:00:00.000Z',
  })
  @IsDateString({}, { message: '正しい日時形式で入力してください' })
  @IsOptional()
  end_at?: string;

  /** 予定の色識別子（cyan/indigo/emerald/violet/rose/amber）。未指定時は変更なし */
  @ApiPropertyOptional({
    description: '予定の色識別子',
    enum: ['cyan', 'indigo', 'emerald', 'violet', 'rose', 'amber'],
  })
  @IsString()
  @IsOptional()
  color?: string;
}

/** 繰り返しグループ全件更新リクエストDTO */
export class UpdateRepeatGroupEventDto {
  /** 予定タイトル */
  @ApiPropertyOptional({ description: '予定タイトル（200文字以内）' })
  @IsString()
  @IsNotEmpty({ message: 'タイトルを入力してください' })
  @MaxLength(200, { message: 'タイトルは200文字以内で入力してください' })
  @IsOptional()
  title?: string;

  /** 予定の説明文 */
  @ApiPropertyOptional({ description: '予定の説明文（1000文字以内）' })
  @IsString()
  @MaxLength(1000, { message: '説明文は1000文字以内で入力してください' })
  @IsOptional()
  description?: string;

  /**
   * 開始日時の差分（ミリ秒）。
   * 各予定の start_at に加算してシフトする。0 の場合は変更なし
   */
  @ApiPropertyOptional({
    description: '開始日時の差分（ミリ秒）',
    example: 3600000,
  })
  @IsInt({ message: '開始日時の差分は整数で指定してください' })
  @IsOptional()
  start_diff_ms?: number;

  /**
   * 終了日時の差分（ミリ秒）。
   * 各予定の end_at に加算してシフトする。0 の場合は変更なし
   */
  @ApiPropertyOptional({
    description: '終了日時の差分（ミリ秒）',
    example: 3600000,
  })
  @IsInt({ message: '終了日時の差分は整数で指定してください' })
  @IsOptional()
  end_diff_ms?: number;

  /** 予定の色識別子（cyan/indigo/emerald/violet/rose/amber）。未指定時は変更なし */
  @ApiPropertyOptional({
    description: '予定の色識別子',
    enum: ['cyan', 'indigo', 'emerald', 'violet', 'rose', 'amber'],
  })
  @IsString()
  @IsOptional()
  color?: string;
}

/** 予定レスポンスDTO */
export interface EventResponseDto {
  id: number;
  title: string;
  description: string;
  start_at: string;
  end_at: string;
  color: string;
  repeat_group_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
