import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Redirect,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AccountService } from '../service/account.service';
import { AccountDto } from '../dto/account';
import { HttpStatus } from '../../common/type/status.enum';
import { MESSAGE } from '../../common/type/message';
import { LoggerService } from '../../common/service/logger.service';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';

const CONTEXT = 'AccountsController';

/** フロントエンドのLINEコールバックページURL */
const FRONTEND_LINE_CALLBACK_URL = process.env.FRONTEND_URL
  ? `${process.env.FRONTEND_URL}/line-callback`
  : 'http://localhost:3000/line-callback';

@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly accountService: AccountService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * ログインエンドポイント
   * 認証成功時はJWTトークンを返す
   */
  @Post('login')
  async checkAccount(
    @Body() account: AccountDto,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `ログインリクエスト: ${account.username}`);

    const token = await this.accountService.login(account);

    if (token) {
      this.logger.log(CONTEXT, `ログイン成功: ${account.username}`);
      return response.status(HttpStatus.OK).json({ token });
    }

    this.logger.warn(CONTEXT, `ログイン失敗: ${account.username}`);
    return response
      .status(HttpStatus.BAD_REQUEST)
      .json({ message: MESSAGE.AUTH.LOGIN_FAILED });
  }

  /**
   * アカウント登録エンドポイント
   * 重複ユーザー名は409、登録成功は201を返す
   */
  @Post('regist')
  async registAccount(
    @Body() account: AccountDto,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `アカウント登録リクエスト: ${account.username}`);

    const result = await this.accountService.regist(account);

    if (result === 'success') {
      this.logger.log(CONTEXT, `アカウント登録成功: ${account.username}`);
      return response
        .status(HttpStatus.CREATED)
        .json({ message: MESSAGE.AUTH.REGIST_SUCCESS });
    }
    if (result === 'duplicate') {
      this.logger.warn(
        CONTEXT,
        `アカウント登録失敗（ユーザー名重複）: ${account.username}`,
      );
      return response
        .status(HttpStatus.CONFLICT)
        .json({ message: MESSAGE.AUTH.REGIST_DUPLICATE });
    }

    this.logger.error(CONTEXT, `アカウント登録失敗: ${account.username}`);
    return response
      .status(HttpStatus.BAD_REQUEST)
      .json({ message: MESSAGE.AUTH.REGIST_FAILED });
  }

  @Get('logout')
  logout() {}

  /**
   * LINE OAuth認証URLへリダイレクトするエンドポイント
   * ユーザーをLINEログイン画面へ誘導する
   */
  @Get('line/login')
  @Redirect()
  lineLogin() {
    this.logger.log(CONTEXT, 'LINE認証URLへリダイレクト');
    const url = this.accountService.getLineLoginUrl();
    return { url, statusCode: HttpStatus.OK };
  }

  /**
   * LINE OAuthコールバックエンドポイント
   * LINEからの認可コードを受け取り、User IDを取得してアカウントに保存する
   * 処理後はフロントエンドのコールバックページへリダイレクトする
   * JwtAuthGuardを適用してログイン済みユーザーのみ連携可能にする
   */
  @Get('line/callback')
  @UseGuards(JwtAuthGuard)
  async lineCallback(
    @Query('code') code: string,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<void> {
    this.logger.log(CONTEXT, 'LINE OAuthコールバック受信');

    const requestUser = req.user;
    if (!requestUser) {
      this.logger.error(CONTEXT, '認証情報が取得できません');
      response.redirect(`${FRONTEND_LINE_CALLBACK_URL}?status=error`);
      return;
    }

    try {
      await this.accountService.handleLineCallback(code, requestUser.username);
      this.logger.log(CONTEXT, `LINE連携成功: ${requestUser.username}`);
      response.redirect(`${FRONTEND_LINE_CALLBACK_URL}?status=success`);
    } catch (error) {
      this.logger.error(CONTEXT, `LINE連携失敗: ${String(error)}`);
      response.redirect(`${FRONTEND_LINE_CALLBACK_URL}?status=error`);
    }
  }

  /**
   * ログインユーザー情報取得エンドポイント
   * LINE連携状態の確認に使用する
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, 'ユーザー情報取得リクエスト');
    const requestUser = req.user;
    if (!requestUser) {
      return response
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: MESSAGE.AUTH.UNAUTHORIZED });
    }
    const me = await this.accountService.getMe(requestUser.username);
    return response.status(HttpStatus.OK).json(me);
  }
}
