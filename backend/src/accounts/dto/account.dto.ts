import { IsString, IsNotEmpty } from 'class-validator';

/** LINE OAuthコールバッククエリパラメータDTO */
export class LineCallbackQueryDto {
  /** LINE OAuthから受け取る認可コード */
  @IsString()
  @IsNotEmpty()
  code: string;
}

/** ログインユーザー情報レスポンスDTO */
export interface AccountMeResponseDto {
  /** ユーザー名 */
  username: string;
  /** LINE User ID（未連携の場合はnull） */
  line_user_id: string | null;
}
