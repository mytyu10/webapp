import { test, expect } from '@playwright/test';
import { generateUsername, registerAndLogin } from './helpers/auth';

/**
 * サイドバーナビゲーション E2E テスト
 *
 * テスト対象:
 * 1. サイドバーの各ナビゲーションリンク
 * 2. 未認証時のリダイレクト
 */

const TEST_PASSWORD = 'testpass1';

test.describe('サイドバーナビゲーション', () => {
  test.beforeEach(async ({ page }) => {
    const username = generateUsername('sb');
    await registerAndLogin(page, username, TEST_PASSWORD);
  });

  test('「タスク管理」リンクで /tasks に遷移する', async ({ page }) => {
    await page.goto('/calendar');
    await page.getByRole('link', { name: 'タスク管理' }).click();

    await page.waitForURL('**/tasks');
    await expect(page.getByRole('heading', { name: 'タスク管理' })).toBeVisible();
  });

  test('「カレンダー」リンクで /calendar に遷移する', async ({ page }) => {
    await page.goto('/tasks');
    await page.getByRole('link', { name: 'カレンダー' }).click();

    await page.waitForURL('**/calendar');
    await expect(page.locator('.fc')).toBeVisible();
  });

  test('「リンク集」リンクで /links に遷移する', async ({ page }) => {
    await page.goto('/tasks');
    await page.getByRole('link', { name: 'リンク集' }).click();

    await page.waitForURL('**/links');
    await expect(page.getByRole('heading', { name: 'リンク集' })).toBeVisible();
  });

  test('「チャット」リンクで /chat に遷移する', async ({ page }) => {
    await page.goto('/tasks');
    await page.getByRole('link', { name: 'チャット' }).click();

    await page.waitForURL('**/chat');
    await expect(page.getByRole('heading', { name: 'チャット' })).toBeVisible();
  });

  test('「プロフィール」リンクで /profile に遷移する', async ({ page }) => {
    await page.goto('/tasks');
    /* サイドバーのプロフィールリンクはユーザー名を表示するため href で特定する */
    await page.locator('a[href="/profile"]').first().click();

    await page.waitForURL('**/profile');
    await expect(page.getByRole('heading', { name: 'プロフィール' })).toBeVisible();
  });
});

test.describe('未認証アクセス', () => {
  test('未ログイン状態で /links にアクセスすると /login にリダイレクトされる', async ({ page }) => {
    await page.goto('/links');
    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
  });

  test('未ログイン状態で /chat にアクセスすると /login にリダイレクトされる', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
  });

  test('未ログイン状態で /profile にアクセスすると /login にリダイレクトされる', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
  });
});
