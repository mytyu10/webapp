import { Page } from '@playwright/test';

/**
 * テスト用のユニークユーザー名を生成する
 * username は10文字以内の制約に合わせる
 */
export function generateUsername(prefix: string = 'u'): string {
  const suffix = Date.now().toString().slice(-7);
  return `${prefix}${suffix}`.slice(0, 10);
}

/**
 * アカウント登録フローを実行する
 * /regist ページでフォームを入力してサブミットし、/login へのリダイレクトを待つ
 */
export async function registerUser(
  page: Page,
  username: string,
  password: string,
): Promise<void> {
  await page.goto('/regist');
  await page.getByLabel('ユーザー名').fill(username);
  await page.getByLabel('パスワード').fill(password);
  /* 「登録」ボタンを exact: true で特定する */
  await page.getByRole('button', { name: '登録', exact: true }).click();
  /* 登録成功後は /login へリダイレクトする */
  await page.waitForURL('**/login');
}

/**
 * ログインフローを実行する
 * /login ページでフォームを入力してサブミットし、ログイン後のページを待つ
 */
export async function loginUser(
  page: Page,
  username: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('ユーザー名').fill(username);
  await page.getByLabel('パスワード').fill(password);
  /* ログインフォームのサブミットボタンを type="submit" で特定する */
  await page.locator('button[type="submit"]').click();
  /* ログイン成功後は / にリダイレクトされ、さらに /tasks へリダイレクトされる */
  await page.waitForURL('**/tasks');
}

/**
 * 登録 → ログインまでの一連のフローを実行する
 */
export async function registerAndLogin(
  page: Page,
  username: string,
  password: string,
): Promise<void> {
  await registerUser(page, username, password);
  await loginUser(page, username, password);
}
