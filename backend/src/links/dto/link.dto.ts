import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsPositive,
  MaxLength,
  IsIn,
  IsUrl,
} from 'class-validator';

/** LinkItem のタイプ有効値 */
export const LINK_ITEM_TYPES = ['FOLDER', 'LINK'] as const;

/** LinkItem のタイプ型 */
export type LinkItemType = (typeof LINK_ITEM_TYPES)[number];

/** リンク/フォルダ作成リクエストDTO */
export class CreateLinkItemDto {
  /** タイトル */
  @IsString()
  @IsNotEmpty({ message: 'タイトルを入力してください' })
  @MaxLength(200, { message: 'タイトルは200文字以内で入力してください' })
  title: string;

  /** URL（type="LINK" の場合のみ必須） */
  @IsUrl({}, { message: '正しいURL形式で入力してください' })
  @IsOptional()
  @MaxLength(2000, { message: 'URLは2000文字以内で入力してください' })
  url?: string;

  /** 説明 */
  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: '説明は1000文字以内で入力してください' })
  description?: string;

  /** タイプ（FOLDER または LINK） */
  @IsIn(LINK_ITEM_TYPES, {
    message: 'タイプは FOLDER または LINK を指定してください',
  })
  type: LinkItemType;

  /** 親フォルダID（ルート直下の場合は省略） */
  @IsInt({ message: '親フォルダIDは整数で指定してください' })
  @IsPositive({ message: '親フォルダIDは正の整数で指定してください' })
  @IsOptional()
  parent_id?: number;

  /** 並び順（省略時は 0） */
  @IsInt({ message: '並び順は整数で指定してください' })
  @IsOptional()
  order?: number;
}

/** リンク/フォルダ更新リクエストDTO */
export class UpdateLinkItemDto {
  /** タイトル */
  @IsString()
  @IsNotEmpty({ message: 'タイトルを入力してください' })
  @MaxLength(200, { message: 'タイトルは200文字以内で入力してください' })
  @IsOptional()
  title?: string;

  /** URL */
  @IsUrl({}, { message: '正しいURL形式で入力してください' })
  @IsOptional()
  @MaxLength(2000, { message: 'URLは2000文字以内で入力してください' })
  url?: string;

  /** 説明 */
  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: '説明は1000文字以内で入力してください' })
  description?: string;

  /** 親フォルダID */
  @IsInt({ message: '親フォルダIDは整数で指定してください' })
  @IsPositive({ message: '親フォルダIDは正の整数で指定してください' })
  @IsOptional()
  parent_id?: number;

  /** 並び順 */
  @IsInt({ message: '並び順は整数で指定してください' })
  @IsOptional()
  order?: number;
}

/** リンク/フォルダレスポンスDTO */
export interface LinkItemResponseDto {
  id: number;
  title: string;
  /** URL（LINK タイプのみ値あり、FOLDER は null） */
  url: string | null;
  description: string;
  /** タイプ（FOLDER または LINK） */
  type: LinkItemType;
  /** 親フォルダID（ルート直下は null） */
  parent_id: number | null;
  order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  /** 子要素（FOLDER のみ持つ。LINK は常に空配列） */
  children: LinkItemResponseDto[];
}
