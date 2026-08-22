/** ログインユーザー情報レスポンスDTO */
export interface AccountMeResponseDto {
  /** ユーザー名 */
  username: string;
  /** 表示名（未設定の場合は null） */
  display_name: string | null;
}
