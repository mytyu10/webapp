export interface RegistFormErrors {
  username?: string;
  password?: string;
}

/**
 * アカウント登録フォームのバリデーション
 */
export function validateRegistForm(username: string, password: string): RegistFormErrors {
  const errors: RegistFormErrors = {};

  if (username.length === 0) {
    errors.username = 'ユーザー名を入力してください。';
  } else if (username.length > 10) {
    errors.username = 'ユーザー名は10文字以内で入力してください。';
  }

  if (password.length === 0) {
    errors.password = 'パスワードを入力してください。';
  } else if (password.length < 8 || password.length > 20) {
    errors.password = 'パスワードは8〜20文字で入力してください。';
  }

  return errors;
}
