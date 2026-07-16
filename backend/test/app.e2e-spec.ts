/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
// E2E テスト起動前に .env を読み込む（DATABASE_URL / JWT_SECRET 等の設定に必要）
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import supertest from 'supertest';
import { AppModule } from '../src/app.module';
import { ThrottlerGuard } from '@nestjs/throttler';
import { MESSAGE } from '../src/common/type/message';

/**
 * E2E テスト
 * 以下のフローをテストする:
 * 1. POST /accounts/regist → ユーザー登録
 * 2. POST /accounts/login → ログイン・JWT取得
 * 3. GET /tasks（JWT付き）→ タスク一覧取得
 * 4. POST /tasks（JWT付き）→ タスク作成
 * 5. GET /events（JWT付き）→ イベント一覧取得
 * 6. 権限・通知系の認可テスト
 *
 * Rate Limiting はテスト環境でオーバーライドして無効化する
 */
describe('App E2E', () => {
  let app: INestApplication;
  let jwtToken: string;
  let otherJwtToken: string;
  let createdTaskId: number;
  let createdEventId: number;

  // テスト用ユーザー名（タイムスタンプで衝突を回避。username は10文字以内）
  const testUsername = `e${Date.now()}`.slice(0, 10);
  const testPassword = 'testpass1';
  // 別ユーザー（権限なし）
  const otherUsername = `o${Date.now()}`.slice(0, 10);
  const otherPassword = 'testpass2';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // ThrottlerGuard をモックして Rate Limit の影響を排除する
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();

    // メイン設定と同じパイプを適用する
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        exceptionFactory: () =>
          new BadRequestException(MESSAGE.VALIDATION.INVALID_INPUT),
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ----------------------------------------------------------------
  // 1. ユーザー登録
  // ----------------------------------------------------------------
  describe('POST /accounts/regist', () => {
    it('新規ユーザーを登録できる（201）', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/accounts/regist')
        .send({ username: testUsername, password: testPassword })
        .expect(201);

      expect(res.body.message).toBeDefined();
    });

    it('別ユーザーを登録できる（201）', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/accounts/regist')
        .send({ username: otherUsername, password: otherPassword })
        .expect(201);

      expect(res.body.message).toBeDefined();
    });

    it('同じユーザー名で再登録すると409が返る', async () => {
      await supertest(app.getHttpServer())
        .post('/accounts/regist')
        .send({ username: testUsername, password: testPassword })
        .expect(409);
    });

    it('パスワードが短すぎる場合は400が返る', async () => {
      await supertest(app.getHttpServer())
        .post('/accounts/regist')
        .send({ username: 'shortp', password: 'short' })
        .expect(400);
    });
  });

  // ----------------------------------------------------------------
  // 2. ログイン・JWT取得
  // ----------------------------------------------------------------
  describe('POST /accounts/login', () => {
    it('正しい認証情報でJWTが返る（200）', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/accounts/login')
        .send({ username: testUsername, password: testPassword })
        .expect(200);

      expect(res.body.token).toBeDefined();
      jwtToken = res.body.token as string;
    });

    it('別ユーザーのJWTを取得する', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/accounts/login')
        .send({ username: otherUsername, password: otherPassword })
        .expect(200);

      expect(res.body.token).toBeDefined();
      otherJwtToken = res.body.token as string;
    });

    it('パスワードが間違っている場合は400が返る', async () => {
      await supertest(app.getHttpServer())
        .post('/accounts/login')
        .send({ username: testUsername, password: 'wrongpassword' })
        .expect(400);
    });

    it('存在しないユーザーのログインは400が返る', async () => {
      await supertest(app.getHttpServer())
        .post('/accounts/login')
        .send({ username: 'noexist99', password: 'password1' })
        .expect(400);
    });
  });

  // ----------------------------------------------------------------
  // 3. タスク一覧取得
  // ----------------------------------------------------------------
  describe('GET /tasks', () => {
    it('JWT付きでタスク一覧が取得できる（200）', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('JWTなしでは401が返る', async () => {
      await supertest(app.getHttpServer()).get('/tasks').expect(401);
    });
  });

  // ----------------------------------------------------------------
  // 4. タスク作成
  // ----------------------------------------------------------------
  describe('POST /tasks', () => {
    it('JWT付きでタスクを作成できる（201）', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          title: 'E2Eテストタスク',
          description: 'E2Eテスト用のタスクです',
          due_date: '2026-12-31T23:59:59.000Z',
          created_by: testUsername,
          assignees: [testUsername],
          priority: 'MEDIUM',
        })
        .expect(201);

      expect(res.body.task).toBeDefined();
      expect(res.body.task.title).toBe('E2Eテストタスク');
      createdTaskId = res.body.task.id as number;
    });

    it('タイトルなしのタスク作成は400が返る', async () => {
      await supertest(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          description: '説明だけ',
          due_date: '2026-12-31T23:59:59.000Z',
          created_by: testUsername,
        })
        .expect(400);
    });

    it('JWTなしでは401が返る', async () => {
      await supertest(app.getHttpServer())
        .post('/tasks')
        .send({
          title: 'タスク',
          description: '説明',
          due_date: '2026-12-31T23:59:59.000Z',
          created_by: testUsername,
        })
        .expect(401);
    });
  });

  // ----------------------------------------------------------------
  // 5. イベント一覧取得
  // ----------------------------------------------------------------
  describe('GET /events', () => {
    it('JWT付きでイベント一覧が取得できる（200）', async () => {
      const res = await supertest(app.getHttpServer())
        .get('/events')
        .set('Authorization', `Bearer ${jwtToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('JWTなしでは401が返る', async () => {
      await supertest(app.getHttpServer()).get('/events').expect(401);
    });
  });

  // ----------------------------------------------------------------
  // 5b. イベント作成（権限テスト用）
  // ----------------------------------------------------------------
  describe('POST /events（権限テスト用）', () => {
    it('JWT付きでイベントを作成できる（201）', async () => {
      const res = await supertest(app.getHttpServer())
        .post('/events')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          title: 'E2Eテストイベント',
          description: 'E2Eテスト用のイベントです',
          start_at: '2026-12-31T10:00:00.000Z',
          end_at: '2026-12-31T11:00:00.000Z',
        })
        .expect(201);

      expect(res.body.event).toBeDefined();
      createdEventId = res.body.event.id as number;
    });
  });

  // ----------------------------------------------------------------
  // 6. 権限・通知系の認可テスト
  // ----------------------------------------------------------------
  describe('認可テスト', () => {
    it('他ユーザーが GET /tasks/:id にアクセスすると403が返る', async () => {
      await supertest(app.getHttpServer())
        .get(`/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${otherJwtToken}`)
        .expect(403);
    });

    it('他ユーザーが POST /tasks/:id/notifications にアクセスすると403が返る', async () => {
      await supertest(app.getHttpServer())
        .post(`/tasks/${createdTaskId}/notifications`)
        .set('Authorization', `Bearer ${otherJwtToken}`)
        .send({ notify_at: '2026-12-30T09:00:00.000Z' })
        .expect(403);
    });

    it('他ユーザーが GET /events/:id にアクセスすると403が返る', async () => {
      await supertest(app.getHttpServer())
        .get(`/events/${createdEventId}`)
        .set('Authorization', `Bearer ${otherJwtToken}`)
        .expect(403);
    });
  });
});
