import { test, expect } from '@playwright/test';
import { generateUsername, registerAndLogin } from './helpers/auth';

/**
 * リンク集 E2E テスト
 *
 * テスト対象:
 * 1. リンク集ページの表示
 * 2. フォルダ作成（CRUD: Create）
 * 3. リンク作成（CRUD: Create）
 * 4. リンク削除（CRUD: Delete）
 * 5. フォルダ削除（CRUD: Delete）
 */

const TEST_PASSWORD = 'testpass1';

test.describe('リンク集ページ', () => {
  test.beforeEach(async ({ page }) => {
    const username = generateUsername('lk');
    await registerAndLogin(page, username, TEST_PASSWORD);
  });

  test('リンク集ページが表示される', async ({ page }) => {
    await page.goto('/links');

    await expect(page.getByRole('heading', { name: 'リンク集' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ 追加' })).toBeVisible();
  });

  test('リンクがない場合はメッセージが表示される', async ({ page }) => {
    await page.goto('/links');

    await expect(page.getByText('リンクがまだありません')).toBeVisible();
  });
});

test.describe('フォルダ作成', () => {
  let testUsername: string;

  test.beforeEach(async ({ page }) => {
    testUsername = generateUsername('lf');
    await registerAndLogin(page, testUsername, TEST_PASSWORD);
  });

  test('フォルダを作成するとツリーに表示される', async ({ page }) => {
    const folderTitle = `E2Eフォルダ${Date.now()}`;

    await page.goto('/links');
    await page.getByRole('button', { name: '+ 追加' }).click();

    /* モーダルが開く */
    await expect(page.getByRole('heading', { name: 'リンク/フォルダを追加' })).toBeVisible();

    /* タイプを「フォルダ」に変更する */
    await page.locator('#link-type').selectOption('FOLDER');

    /* タイトルを入力する */
    await page.locator('#link-title').fill(folderTitle);

    /* 追加する */
    await page.getByRole('button', { name: '追加する' }).click();

    /* 作成したフォルダがツリーに表示されること */
    await expect(page.getByText(folderTitle)).toBeVisible();
  });
});

test.describe('リンク作成', () => {
  let testUsername: string;

  test.beforeEach(async ({ page }) => {
    testUsername = generateUsername('ll');
    await registerAndLogin(page, testUsername, TEST_PASSWORD);
  });

  test('リンクを作成するとツリーに表示される', async ({ page }) => {
    const linkTitle = `E2Eリンク${Date.now()}`;

    await page.goto('/links');
    await page.getByRole('button', { name: '+ 追加' }).click();

    /* モーダルが開く */
    await expect(page.getByRole('heading', { name: 'リンク/フォルダを追加' })).toBeVisible();

    /* タイプは「リンク」（デフォルト） */
    await page.locator('#link-type').selectOption('LINK');

    /* タイトルを入力する */
    await page.locator('#link-title').fill(linkTitle);

    /* URL を入力する */
    await page.locator('#link-url').fill('https://example.com');

    /* 追加する */
    await page.getByRole('button', { name: '追加する' }).click();

    /* 作成したリンクがツリーに表示されること */
    await expect(page.getByText(linkTitle)).toBeVisible();
  });

  test('タイトル未入力で送信するとバリデーションエラーが表示される', async ({ page }) => {
    await page.goto('/links');
    await page.getByRole('button', { name: '+ 追加' }).click();

    await page.locator('#link-type').selectOption('LINK');
    await page.locator('#link-url').fill('https://example.com');
    await page.getByRole('button', { name: '追加する' }).click();

    /* バリデーションエラーが表示されること */
    await expect(page.locator('p.text-red-400').first()).toBeVisible();
  });

  test('キャンセルボタンでモーダルが閉じる', async ({ page }) => {
    await page.goto('/links');
    await page.getByRole('button', { name: '+ 追加' }).click();

    await expect(page.getByRole('heading', { name: 'リンク/フォルダを追加' })).toBeVisible();

    await page.getByRole('button', { name: 'キャンセル' }).click();

    await expect(page.getByRole('heading', { name: 'リンク/フォルダを追加' })).not.toBeVisible();
  });
});

test.describe('リンク削除', () => {
  let deleteTestUsername: string;

  test.beforeEach(async ({ page }) => {
    deleteTestUsername = generateUsername('ld');
    await registerAndLogin(page, deleteTestUsername, TEST_PASSWORD);

    /* テスト用リンクを作成する */
    await page.goto('/links');
    await page.getByRole('button', { name: '+ 追加' }).click();
    await page.locator('#link-type').selectOption('LINK');
    await page.locator('#link-title').fill('削除テスト用リンク');
    await page.locator('#link-url').fill('https://example.com');
    await page.getByRole('button', { name: '追加する' }).click();

    /* リンクが表示されるまで待つ */
    await expect(page.getByText('削除テスト用リンク')).toBeVisible();
  });

  test('リンクを削除するとツリーから消える', async ({ page }) => {
    /* 削除ボタンをホバーで表示させてクリックする */
    await page.getByText('削除テスト用リンク').hover();
    await page.getByRole('button', { name: '削除' }).first().click();

    /* 削除確認モーダルが表示されること */
    await expect(page.getByRole('heading', { name: '削除の確認' })).toBeVisible();

    /* 削除する */
    await page.getByRole('button', { name: '削除する' }).click();

    /* リンクがツリーから消えること */
    await expect(page.getByText('削除テスト用リンク')).not.toBeVisible();
  });
});

test.describe('フォルダ削除', () => {
  let folderDeleteUsername: string;

  test.beforeEach(async ({ page }) => {
    folderDeleteUsername = generateUsername('lfd');
    await registerAndLogin(page, folderDeleteUsername, TEST_PASSWORD);

    /* テスト用フォルダを作成する */
    await page.goto('/links');
    await page.getByRole('button', { name: '+ 追加' }).click();
    await page.locator('#link-type').selectOption('FOLDER');
    await page.locator('#link-title').fill('削除テスト用フォルダ');
    await page.getByRole('button', { name: '追加する' }).click();

    /* フォルダが表示されるまで待つ */
    await expect(page.getByText('削除テスト用フォルダ')).toBeVisible();
  });

  test('フォルダを削除するとツリーから消える', async ({ page }) => {
    /* 削除ボタンをホバーで表示させてクリックする */
    await page.getByText('削除テスト用フォルダ').hover();
    await page.getByRole('button', { name: '削除' }).first().click();

    /* 削除確認モーダルが表示されること */
    await expect(page.getByRole('heading', { name: '削除の確認' })).toBeVisible();

    /* 削除する */
    await page.getByRole('button', { name: '削除する' }).click();

    /* フォルダがツリーから消えること */
    await expect(page.getByText('削除テスト用フォルダ')).not.toBeVisible();
  });
});
