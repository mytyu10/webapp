import { test, expect } from '@playwright/test';
import { generateUsername, registerAndLogin } from './helpers/auth';

/**
 * タスク管理 E2E テスト
 *
 * テスト対象:
 * 1. タスク一覧ページの表示
 * 2. タスク作成
 * 3. タスク詳細パネルの表示
 */

const TEST_PASSWORD = 'testpass1';

test.describe('タスク一覧', () => {
  test.beforeEach(async ({ page }) => {
    const username = generateUsername('t');
    await registerAndLogin(page, username, TEST_PASSWORD);
  });

  test('タスク管理ページが表示される', async ({ page }) => {
    await page.goto('/tasks');

    await expect(page.getByRole('heading', { name: 'タスク管理' })).toBeVisible();
    /* 「タスクを作成」ボタンが表示されること */
    await expect(page.getByRole('button', { name: 'タスクを作成' })).toBeVisible();
  });

  test('タスクがない場合はメッセージが表示される', async ({ page }) => {
    await page.goto('/tasks');

    await expect(page.getByText('タスクがありません。')).toBeVisible();
  });
});

test.describe('タスク作成', () => {
  let testUsername: string;

  test.beforeEach(async ({ page }) => {
    testUsername = generateUsername('tc');
    await registerAndLogin(page, testUsername, TEST_PASSWORD);
  });

  test('「タスクを作成」ボタンで /tasks/new に遷移する', async ({ page }) => {
    await page.goto('/tasks');
    await page.getByRole('button', { name: 'タスクを作成' }).click();

    await page.waitForURL('**/tasks/new');
    await expect(page.getByRole('heading', { name: 'タスクを作成' })).toBeVisible();
  });

  test('タスク作成フォームで必須項目を入力して送信すると一覧にタスクが追加される', async ({ page }) => {
    const taskTitle = `E2Eタスク${Date.now()}`;

    await page.goto('/tasks/new');

    /* タイトルを入力する */
    await page.getByLabel('タイトル').fill(taskTitle);

    /* 説明文を入力する */
    await page.getByLabel('説明文').fill('E2Eテスト用の説明');

    /* 期限を入力する（datetime-local 形式） */
    await page.locator('input[type="datetime-local"]').fill('2026-12-31T23:59');

    /* 担当者を選択する（自分自身を選ぶ） */
    const assigneeSelect = page.locator('select').last();
    await assigneeSelect.selectOption({ label: testUsername });

    /* 送信する */
    await page.getByRole('button', { name: '作成する' }).click();

    /* /tasks に戻ること */
    await page.waitForURL('**/tasks');

    /* 作成したタスクが一覧に表示されること */
    await expect(page.getByText(taskTitle)).toBeVisible();
  });

  test('タイトル未入力で送信するとバリデーションエラーが表示される', async ({ page }) => {
    await page.goto('/tasks/new');

    await page.getByRole('button', { name: '作成する' }).click();

    await expect(page.locator('p.text-red-400').first()).toBeVisible();
    expect(page.url()).toContain('/tasks/new');
  });

  test('キャンセルボタンで /tasks に戻る', async ({ page }) => {
    await page.goto('/tasks/new');
    await page.getByRole('button', { name: 'キャンセル' }).click();

    await page.waitForURL('**/tasks');
  });
});

test.describe('タスク詳細パネル', () => {
  let panelTestUsername: string;

  test.beforeEach(async ({ page }) => {
    panelTestUsername = generateUsername('td');
    await registerAndLogin(page, panelTestUsername, TEST_PASSWORD);

    /* テスト用タスクを作成する */
    await page.goto('/tasks/new');
    await page.getByLabel('タイトル').fill('詳細パネルテスト用タスク');
    await page.getByLabel('説明文').fill('テスト用');
    await page.locator('input[type="datetime-local"]').fill('2026-12-31T23:59');
    const assigneeSelect = page.locator('select').last();
    await assigneeSelect.selectOption({ label: panelTestUsername });
    await page.getByRole('button', { name: '作成する' }).click();
    await page.waitForURL('**/tasks');
  });

  test('タスクカードをクリックすると詳細パネルが開く', async ({ page }) => {
    /* タスクカードをクリック */
    await page.getByText('詳細パネルテスト用タスク').first().click();

    /* 詳細パネルが表示されること（タスクタイトルがパネル内にある） */
    /* TaskDetailPanel は詳細情報を表示するため、タイトルが2箇所に表示される */
    await expect(page.getByText('詳細パネルテスト用タスク').nth(1)).toBeVisible();
  });
});
