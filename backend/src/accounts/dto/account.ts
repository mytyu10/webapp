import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AccountDto {
  @ApiProperty({ description: 'ユーザー名（1〜10文字）', example: 'alice' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(10)
  readonly username: string;

  @ApiProperty({ description: 'パスワード（8〜20文字）', example: 'password1' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(20)
  readonly password: string;
}
