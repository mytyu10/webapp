import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Playwright E2E テスト設定
 *
 * フロントエンドはビルド成果物を serve で配信する。
 * これにより .env.local の影響を受けず、.env の設定（API_HOST=localhost:8000）で動作する。
 *
 * ローカル実行: バックエンド・フロントエンドを webServer で自動起動する
 * CI 実行: 既存ジョブで起動済みのサーバーを再利用する（reuseExistingServer: true）
 */
const isCI = !!process.env.CI;
const frontendDir = path.resolve(__dirname, '../frontend');
const buildDir = path.join(frontendDir, 'build');

/**
 * フロントエンドのビルドが存在しない場合、または古い場合は再ビルドする。
 * .env.local を読まずに .env の設定でビルドするため、環境変数を明示的に渡す。
 */
function ensureFrontendBuild(): void {
  const indexPath = path.join(buildDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log('[playwright] フロントエンドをビルドします...');
    execSync('npm run build', {
      cwd: frontendDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        /* .env.local を無効化し .env の値を使用する */
        REACT_APP_API_SCHEME: 'http',
        REACT_APP_API_HOST: 'localhost',
        REACT_APP_API_PORT: '8000',
        GENERATE_SOURCEMAP: 'false',
        CI: 'false',
      },
    });
  }
}

/* ビルドが存在しない場合のみ実行（webServer 起動前に確実に完了させる） */
if (!isCI) {
  ensureFrontendBuild();
}

export default defineConfig({
  testDir: './tests',

  /* テスト失敗時のリトライ回数（CI のみ1回リトライ） */
  retries: isCI ? 1 : 0,

  /* 並列実行を無効化（テストユーザー衝突・DB競合を防ぐ） */
  workers: 1,

  /* テストタイムアウト */
  timeout: 30000,

  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  reporter: isCI
    ? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'playwright-report', open: 'on-failure' }]],

  webServer: [
    {
      /* バックエンド: ビルド済みの dist を起動する */
      command: 'node ../backend/dist/src/main.js',
      url: 'http://localhost:8000/api/docs',
      reuseExistingServer: true,
      timeout: 60000,
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: process.env.DATABASE_URL ?? 'file:../backend/prisma/playwright-test.db',
        JWT_SECRET: process.env.JWT_SECRET ?? 'playwright-e2e-secret',
        FRONTEND_URL: 'http://localhost:3000',
        /* Playwright E2E では音声コマンドエンドポイントをテストしないため、
         * ANTHROPIC_API_KEY が未設定の場合はダミー値を使用して起動ガードを通過させる */
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? 'dummy-key-for-e2e',
      },
    },
    {
      /* フロントエンド: ビルド済みの build/ を serve で配信する */
      command: 'npx serve -s ../frontend/build -l 3000',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
