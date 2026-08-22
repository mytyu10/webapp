import { test, expect } from '@playwright/test';
import { generateUsername, registerAndLogin } from './helpers/auth';

/**
 * カレンダー E2E テスト
 *
 * テスト対象:
 * 1. カレンダーページの表示
 * 2. ビュー切り替え
 * 3. 予定作成（CRUD: Create）
 * 4. 予定削除（CRUD: Delete）
 */

const TEST_PASSWORD = 'testpass1';

test.describe('カレンダー', () => {
  test.beforeEach(async ({ page }) => {
    const username = generateUsername('cal');
    await registerAndLogin(page, username, TEST_PASSWORD);
  });

  test('カレンダーページが表示される', async ({ page }) => {
    await page.goto('/calendar');

    /* FullCalendar のコンテナが表示されること */
    await expect(page.locator('.fc')).toBeVisible();
  });

  test('サイドバーの「カレンダー」リンクでカレンダーページに遷移する', async ({ page }) => {
    await page.goto('/tasks');

    await page.getByRole('link', { name: 'カレンダー' }).click();

    await page.waitForURL('**/calendar');
    await expect(page.locator('.fc')).toBeVisible();
  });

  test('月表示・週表示・日表示を切り替えられる', async ({ page }) => {
    await page.goto('/calendar');

    /* FullCalendar が表示されるまで待つ */
    await expect(page.locator('.fc')).toBeVisible();

    /* デフォルトは月ビュー: .fc-dayGridMonth-view が表示されていること */
    await expect(page.locator('.fc-dayGridMonth-view')).toBeVisible();

    /* 週ビューに切り替える */
    await page.getByRole('button', { name: '週', exact: true }).click();
    await expect(page.locator('.fc-timeGridWeek-view')).toBeVisible();

    /* 日ビューに切り替える（「今日」ボタンと区別するため exact: true を使用） */
    await page.getByRole('button', { name: '日', exact: true }).click();
    await expect(page.locator('.fc-timeGridDay-view')).toBeVisible();

    /* 月ビューに戻す */
    await page.getByRole('button', { name: '月', exact: true }).click();
    await expect(page.locator('.fc-dayGridMonth-view')).toBeVisible();
  });
});

test.describe('予定作成', () => {
  test.beforeEach(async ({ page }) => {
    const username = generateUsername('cev');
    await registerAndLogin(page, username, TEST_PASSWORD);
  });

  test('日付セルをクリックすると予定作成モーダルが開く（CRUD: Create）', async ({ page }) => {
    await page.goto('/calendar');

    /* FullCalendar が表示されるまで待つ */
    await expect(page.locator('.fc-dayGridMonth-view')).toBeVisible();

    /* 月ビューの日付セル（今日以降）をクリックする */
    await page.locator('.fc-daygrid-day').first().click();

    /* 予定作成モーダルが開くこと */
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: '予定を作成' })).toBeVisible();
  });

  test('予定タイトルを入力して保存すると予定がカレンダーに表示される', async ({ page }) => {
    const eventTitle = `E2E予定${Date.now()}`;

    await page.goto('/calendar');
    await expect(page.locator('.fc-dayGridMonth-view')).toBeVisible();

    /* 日付セルをクリックして作成モーダルを開く */
    await page.locator('.fc-daygrid-day').first().click();
    await expect(page.getByRole('heading', { name: '予定を作成' })).toBeVisible();

    /* タイトルを入力する（FormField の label="タイトル"） */
    await page.getByLabel('タイトル').fill(eventTitle);

    /* 「保存」ボタンをクリックする */
    await page.getByRole('button', { name: '保存', exact: true }).click();

    /* 予定がカレンダーに表示されること */
    await expect(page.getByText(eventTitle)).toBeVisible();
  });

  test('予定作成モーダルでキャンセルするとモーダルが閉じる', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page.locator('.fc-dayGridMonth-view')).toBeVisible();

    await page.locator('.fc-daygrid-day').first().click();
    await expect(page.getByRole('heading', { name: '予定を作成' })).toBeVisible();

    /* キャンセルボタンをクリックする */
    await page.getByRole('button', { name: 'キャンセル' }).click();

    /* モーダルが閉じること */
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});

test.describe('予定削除', () => {
  let calDeleteUsername: string;

  test.beforeEach(async ({ page }) => {
    calDeleteUsername = generateUsername('ced');
    await registerAndLogin(page, calDeleteUsername, TEST_PASSWORD);

    /* テスト用予定を作成する */
    await page.goto('/calendar');
    await expect(page.locator('.fc-dayGridMonth-view')).toBeVisible();

    await page.locator('.fc-daygrid-day').first().click();
    await expect(page.getByRole('heading', { name: '予定を作成' })).toBeVisible();
    await page.getByLabel('タイトル').fill('削除テスト用予定');
    await page.getByRole('button', { name: '保存', exact: true }).click();

    /* 予定がカレンダーに表示されるまで待つ */
    await expect(page.getByText('削除テスト用予定')).toBeVisible();
  });

  test('予定をクリックして削除できる（CRUD: Delete）', async ({ page }) => {
    /* カレンダーに表示されている予定をクリックする */
    await page.getByText('削除テスト用予定').click();

    /* 編集モーダルが開くこと */
    await expect(page.getByRole('heading', { name: '予定を編集' })).toBeVisible();

    /* 削除ボタンをクリックする */
    await page.getByRole('button', { name: '削除' }).click();

    /* 削除確認ダイアログが表示されること */
    await expect(page.getByText('この予定を削除しますか？')).toBeVisible();

    /* 削除を確定する */
    await page.getByRole('button', { name: '削除する' }).click();

    /* 予定がカレンダーから消えること */
    await expect(page.getByText('削除テスト用予定')).not.toBeVisible();
  });
});
