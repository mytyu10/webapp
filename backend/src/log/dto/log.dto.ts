import { IsIn, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** フロントエンドからのログ送信 DTO */
export class CreateLogDto {
  @ApiProperty({
    description: 'ログレベル',
    enum: ['warn', 'error'],
    example: 'error',
  })
  @IsIn(['warn', 'error'])
  readonly level: 'warn' | 'error';

  @ApiProperty({
    description: 'ログのコンテキスト（コンポーネント名・フック名など）',
    example: 'useTaskList',
  })
  @IsString()
  @MaxLength(100)
  readonly context: string;

  @ApiProperty({
    description: 'ログメッセージ',
    example: 'タスクの取得に失敗しました',
  })
  @IsString()
  @MaxLength(2000)
  readonly message: string;

  @ApiProperty({
    description: 'クライアント側のタイムスタンプ（ISO 8601）',
    example: '2026-08-22T10:00:00.000Z',
  })
  @IsString()
  readonly timestamp: string;
}
