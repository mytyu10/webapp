import { test, expect } from '@playwright/test';
import { generateUsername, registerUser, loginUser } from './helpers/auth';

/**
 * 認証フロー E2E テスト
 *
 * テスト対象:
 * 1. アカウント登録（/regist）
 * 2. ログイン（/login）
 * 3. ログアウト
 * 4. 未認証時のリダイレクト
 */

const TEST_PASSWORD = 'testpass1';

test.describe('アカウント登録', () => {
  test('新規ユーザーを登録すると /login にリダイレクトされる', async ({ page }) => {
    const username = generateUsername('r');

    await page.goto('/regist');
    await expect(page.getByRole('heading', { name: 'アカウント登録' })).toBeVisible();

    await page.getByLabel('ユーザー名').fill(username);
    await page.getByLabel('パスワード').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: '登録', exact: true }).click();

    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
  });

  test('ユーザー名が空のまま送信するとバリデーションエラーが表示される', async ({ page }) => {
    await page.goto('/regist');

    await page.getByLabel('パスワード').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: '登録', exact: true }).click();

    /* バリデーションエラーメッセージが表示されること */
    await expect(page.locator('p.text-red-400').first()).toBeVisible();
    /* /regist のまま留まること */
    expect(page.url()).toContain('/regist');
  });

  test('パスワードが短すぎるとバリデーションエラーが表示される', async ({ page }) => {
    const username = generateUsername('r');

    await page.goto('/regist');
    await page.getByLabel('ユーザー名').fill(username);
    await page.getByLabel('パスワード').fill('abc');
    await page.getByRole('button', { name: '登録', exact: true }).click();

    await expect(page.locator('p.text-red-400').first()).toBeVisible();
    expect(page.url()).toContain('/regist');
  });
});

test.describe('ログイン', () => {
  let testUsername: string;

  test.beforeEach(async ({ page }) => {
    testUsername = generateUsername('l');
    await registerUser(page, testUsername, TEST_PASSWORD);
  });

  test('正しい認証情報でログインすると /tasks にリダイレクトされる', async ({ page }) => {
    await loginUser(page, testUsername, TEST_PASSWORD);

    await expect(page.getByRole('heading', { name: 'タスク管理' })).toBeVisible();
  });

  test('パスワードが間違っているとエラーメッセージが表示される', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('ユーザー名').fill(testUsername);
    await page.getByLabel('パスワード').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    /* APIエラーバナーが表示されること */
    await expect(page.locator('[class*="text-red"]').first()).toBeVisible();
    /* /login のまま留まること */
    expect(page.url()).toContain('/login');
  });

  test('存在しないユーザーでログインするとエラーが表示される', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('ユーザー名').fill('noexist99');
    await page.getByLabel('パスワード').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('[class*="text-red"]').first()).toBeVisible();
    expect(page.url()).toContain('/login');
  });
});

test.describe('ログアウト', () => {
  test('ログアウトすると /login にリダイレクトされる', async ({ page }) => {
    const username = generateUsername('lo');
    await registerUser(page, username, TEST_PASSWORD);
    await loginUser(page, username, TEST_PASSWORD);

    /* サイドバーのログアウトボタンをクリック */
    await page.getByRole('button', { name: 'ログアウト' }).click();

    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
  });
});

test.describe('未認証アクセス', () => {
  test('未ログイン状態で /tasks にアクセスすると /login にリダイレクトされる', async ({ page }) => {
    /* localStorage を空にした状態でアクセス */
    await page.goto('/tasks');
    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
  });

  test('未ログイン状態で /calendar にアクセスすると /login にリダイレクトされる', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
  });
});
