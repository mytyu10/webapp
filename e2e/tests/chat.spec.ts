import { test, expect } from '@playwright/test';
import { generateUsername, registerAndLogin, registerUser, loginUser } from './helpers/auth';

/**
 * チャット E2E テスト
 *
 * テスト対象:
 * 1. チャットページの表示
 * 2. ユーザー一覧の表示
 * 3. メッセージ送信（CRUD: Create）
 * 4. メッセージ表示確認
 *
 * 注意: チャット送受信は2ユーザーが必要なため、
 * 2人のユーザーを登録してメッセージ送受信テストを行う。
 * workers: 1 で直列実行されるため、2ページを使う
 */

const TEST_PASSWORD = 'testpass1';

test.describe('チャットページ', () => {
  test.beforeEach(async ({ page }) => {
    const username = generateUsername('ch');
    await registerAndLogin(page, username, TEST_PASSWORD);
  });

  test('チャットページが表示される', async ({ page }) => {
    await page.goto('/chat');

    await expect(page.getByRole('heading', { name: 'チャット' })).toBeVisible();
    /* 相手が選択されていない状態のプレースホルダーが表示されること */
    await expect(
      page.getByText('左のリストからチャット相手を選択してください'),
    ).toBeVisible();
  });
});

test.describe('チャット相手選択とメッセージ送信', () => {
  let userA: string;
  let userB: string;

  test.beforeAll(async ({ browser }) => {
    /* 2ユーザーを事前に登録する */
    userA = generateUsername('ca');
    userB = generateUsername('cb');

    const pageA = await browser.newPage();
    await registerUser(pageA, userA, TEST_PASSWORD);
    await pageA.close();

    const pageB = await browser.newPage();
    await registerUser(pageB, userB, TEST_PASSWORD);
    await pageB.close();
  });

  test('ユーザーリストに他のユーザーが表示される', async ({ page }) => {
    await loginUser(page, userA, TEST_PASSWORD);
    await page.goto('/chat');

    /* 左ペインに userB が「ユーザー」セクションに表示されること */
    await expect(page.getByText(userB)).toBeVisible();
  });

  test('相手を選択するとメッセージエリアが表示される', async ({ page }) => {
    await loginUser(page, userA, TEST_PASSWORD);
    await page.goto('/chat');

    /* userB のリストアイテムをクリックする */
    await page.getByRole('button', { name: userB }).click();

    /* ヘッダーに相手名が表示されること */
    await expect(page.getByRole('heading', { name: userB })).toBeVisible();

    /* メッセージなし状態のテキストが表示されること */
    await expect(
      page.getByText('まだメッセージがありません。最初のメッセージを送りましょう。'),
    ).toBeVisible();
  });

  test('メッセージを送信するとバブルが表示される（CRUD: Create）', async ({ page }) => {
    const messageContent = `E2Eテストメッセージ${Date.now()}`;

    await loginUser(page, userA, TEST_PASSWORD);
    await page.goto('/chat');

    /* userB を選択する */
    await page.getByRole('button', { name: userB }).click();

    /* メッセージを入力して送信する */
    await page.locator('textarea').fill(messageContent);
    await page.getByRole('button', { name: '送信' }).click();

    /* 送信したメッセージがバブルとして表示されること */
    await expect(page.getByText(messageContent)).toBeVisible();
  });

  test('複数メッセージを送信するとすべて表示される', async ({ page }) => {
    const message1 = `メッセージ1-${Date.now()}`;
    const message2 = `メッセージ2-${Date.now()}`;

    await loginUser(page, userA, TEST_PASSWORD);
    await page.goto('/chat');

    await page.getByRole('button', { name: userB }).click();

    /* 1通目のメッセージを送信する */
    await page.locator('textarea').fill(message1);
    await page.getByRole('button', { name: '送信' }).click();
    await expect(page.getByText(message1)).toBeVisible();

    /* 2通目のメッセージを送信する */
    await page.locator('textarea').fill(message2);
    await page.getByRole('button', { name: '送信' }).click();
    await expect(page.getByText(message2)).toBeVisible();

    /* 1通目も引き続き表示されていること */
    await expect(page.getByText(message1)).toBeVisible();
  });

  test('空メッセージは送信ボタンが無効化されている', async ({ page }) => {
    await loginUser(page, userA, TEST_PASSWORD);
    await page.goto('/chat');

    await page.getByRole('button', { name: userB }).click();

    /* textarea が空のとき送信ボタンは disabled */
    await expect(page.getByRole('button', { name: '送信' })).toBeDisabled();
  });
});
