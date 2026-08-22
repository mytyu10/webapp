import { test, expect } from '@playwright/test';
import { generateUsername, registerAndLogin } from './helpers/auth';

/**
 * カレンダー E2E テスト
 *
 * テスト対象:
 * 1. カレンダーページの表示
 * 2. ビュー切り替え
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
