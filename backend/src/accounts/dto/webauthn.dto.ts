import { IsNotEmpty, IsObject, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** 登録開始リクエストDTO */
export class WebAuthnRegistrationStartDto {
  @ApiProperty({ description: 'ユーザー名', example: 'alice' })
  @IsString()
  @IsNotEmpty()
  readonly username: string;
}

/** 登録完了リクエストDTO */
export class WebAuthnRegistrationFinishDto {
  @ApiProperty({ description: 'ユーザー名', example: 'alice' })
  @IsString()
  @IsNotEmpty()
  readonly username: string;

  @ApiProperty({
    description: 'WebAuthn登録レスポンス（ブラウザが生成したJSON）',
  })
  @IsObject()
  readonly response: Record<string, unknown>;
}

/** 認証開始リクエストDTO */
export class WebAuthnAuthenticationStartDto {
  @ApiProperty({ description: 'ユーザー名', example: 'alice' })
  @IsString()
  @IsNotEmpty()
  readonly username: string;
}

/** 認証完了リクエストDTO */
export class WebAuthnAuthenticationFinishDto {
  @ApiProperty({ description: 'ユーザー名', example: 'alice' })
  @IsString()
  @IsNotEmpty()
  readonly username: string;

  @ApiProperty({
    description: 'WebAuthn認証レスポンス（ブラウザが生成したJSON）',
  })
  @IsObject()
  readonly response: Record<string, unknown>;
}
