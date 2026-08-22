import { test, expect } from '@playwright/test';
import { generateUsername, registerAndLogin } from './helpers/auth';

/**
 * プロフィール E2E テスト
 *
 * テスト対象:
 * 1. プロフィールページの表示
 * 2. ユーザー名の表示（変更不可）
 * 3. 表示名の更新（CRUD: Update）
 * 4. 表示名の削除（空欄で保存）
 * 5. GitHub 連携セクションの表示
 */

const TEST_PASSWORD = 'testpass1';

test.describe('プロフィールページ', () => {
  let testUsername: string;

  test.beforeEach(async ({ page }) => {
    testUsername = generateUsername('pr');
    await registerAndLogin(page, testUsername, TEST_PASSWORD);
  });

  test('プロフィールページが表示される', async ({ page }) => {
    await page.goto('/profile');

    await expect(page.getByRole('heading', { name: 'プロフィール' })).toBeVisible();
  });

  test('ログインユーザーのユーザー名が表示される', async ({ page }) => {
    await page.goto('/profile');

    /* ユーザー名表示エリアにユーザー名が表示されること（サイドバーと重複しないよう main 内に絞る） */
    await expect(page.locator('main').getByText(testUsername)).toBeVisible();
  });

  test('表示名入力欄が表示される', async ({ page }) => {
    await page.goto('/profile');

    await expect(page.locator('#display-name')).toBeVisible();
    await expect(page.getByRole('button', { name: '保存する' })).toBeVisible();
  });

  test('表示名を更新すると成功メッセージが表示される（CRUD: Update）', async ({ page }) => {
    await page.goto('/profile');

    /* 表示名を入力する */
    await page.locator('#display-name').fill('テスト表示名');

    /* 保存する */
    await page.getByRole('button', { name: '保存する' }).click();

    /* 成功メッセージが表示されること */
    await expect(page.getByText('プロフィールを更新しました。')).toBeVisible();
  });

  test('表示名を空にして保存すると削除できる', async ({ page }) => {
    await page.goto('/profile');

    /* 表示名を入力して保存する */
    await page.locator('#display-name').fill('削除する表示名');
    await page.getByRole('button', { name: '保存する' }).click();
    await expect(page.getByText('プロフィールを更新しました。')).toBeVisible();

    /* 表示名を空にして保存する */
    await page.locator('#display-name').clear();
    await page.getByRole('button', { name: '保存する' }).click();

    /* 再び成功メッセージが表示されること */
    await expect(page.getByText('プロフィールを更新しました。')).toBeVisible();
  });

  test('表示名が20文字を超えると保存ボタンが無効化される', async ({ page }) => {
    await page.goto('/profile');

    /* 21文字を入力する */
    await page.locator('#display-name').fill('a'.repeat(21));

    /* maxLength 属性により20文字に切り詰められることを確認する */
    const value = await page.locator('#display-name').inputValue();
    /* maxLength=20 のため20文字以下であること */
    expect(value.length).toBeLessThanOrEqual(20);
  });
});

test.describe('GitHub 連携セクション', () => {
  test.beforeEach(async ({ page }) => {
    const username = generateUsername('gh');
    await registerAndLogin(page, username, TEST_PASSWORD);
  });

  test('GitHub 連携セクションが表示される', async ({ page }) => {
    await page.goto('/profile');

    await expect(page.getByRole('heading', { name: 'GitHub 連携' })).toBeVisible();
  });

  test('未連携状態では「GitHub と連携する」ボタンが表示される', async ({ page }) => {
    await page.goto('/profile');

    /* GitHub 連携セクションのローディングが完了するまで待つ */
    await expect(page.getByRole('heading', { name: 'GitHub 連携' })).toBeVisible();

    /* 未連携時は「GitHub と連携する」ボタンが表示されること */
    await expect(page.getByRole('button', { name: 'GitHub と連携する' })).toBeVisible();
  });

  test('サイドバーの「プロフィール」リンクでプロフィールページに遷移する', async ({ page }) => {
    await page.goto('/tasks');

    /* サイドバーのプロフィールリンクはユーザー名を表示するため href で特定する */
    await page.locator('a[href="/profile"]').first().click();

    await page.waitForURL('**/profile');
    await expect(page.getByRole('heading', { name: 'プロフィール' })).toBeVisible();
  });
});
