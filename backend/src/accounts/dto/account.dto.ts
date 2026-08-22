import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** ログインユーザー情報レスポンスDTO */
export interface AccountMeResponseDto {
  /** ユーザー名 */
  username: string;
  /** 表示名（未設定の場合は null） */
  display_name: string | null;
}

/** プロフィール更新DTO */
export class UpdateMeDto {
  @ApiPropertyOptional({
    description: '表示名（最大20文字。null を渡すと削除）',
    example: '山田 太郎',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  readonly display_name?: string | null;
}
