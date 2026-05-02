export interface LoginFormErrors {
  username?: string;
  password?: string;
}

export function validateLoginForm(username: string, password: string): LoginFormErrors {
  const errors: LoginFormErrors = {};

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
