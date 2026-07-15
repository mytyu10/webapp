import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/** チャットメッセージ送信リクエストDTO */
export class CreateChatMessageDto {
  /** 送信先ユーザー名 */
  @IsString()
  @IsNotEmpty({ message: '送信先ユーザーを指定してください' })
  to_user: string;

  /** メッセージ内容 */
  @IsString()
  @IsNotEmpty({ message: 'メッセージを入力してください' })
  @MaxLength(2000, { message: 'メッセージは2000文字以内で入力してください' })
  content: string;
}

/** チャットメッセージレスポンスDTO */
export interface ChatMessageResponseDto {
  id: number;
  from_user: string;
  to_user: string;
  content: string;
  created_at: string;
}

/** チャット相手レスポンスDTO */
export interface ChatContactResponseDto {
  username: string;
}
