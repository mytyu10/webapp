import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** 権限の有効値 */
export const PERMISSION_VALUES = ['READ', 'WRITE'] as const;

/** 権限型 */
export type PermissionType = (typeof PERMISSION_VALUES)[number];

/** 権限付与リクエストDTO */
export class CreatePermissionDto {
  /** 権限を付与するユーザー名 */
  @ApiProperty({ description: '権限を付与するユーザー名', example: 'bob' })
  @IsString()
  @IsNotEmpty({ message: 'ユーザー名を入力してください' })
  username: string;

  /** 権限種別（READ または WRITE） */
  @ApiProperty({
    description: '権限種別',
    enum: ['READ', 'WRITE'],
    example: 'WRITE',
  })
  @IsIn(PERMISSION_VALUES, {
    message: '権限はREADまたはWRITEを指定してください',
  })
  permission: PermissionType;
}

/** 権限レスポンスDTO */
export interface PermissionResponseDto {
  /** 権限を付与されたユーザー名 */
  username: string;
  /** 権限種別（READ または WRITE） */
  permission: PermissionType;
}
