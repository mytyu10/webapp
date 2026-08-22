import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AccountService } from 'src/accounts/service/account.service';
import { WebAuthnService } from 'src/accounts/service/webauthn.service';
import { AccountDto } from 'src/accounts/dto/account';
import { UpdateMeDto } from 'src/accounts/dto/account.dto';
import {
  WebAuthnRegistrationStartDto,
  WebAuthnRegistrationFinishDto,
  WebAuthnAuthenticationStartDto,
  WebAuthnAuthenticationFinishDto,
} from 'src/accounts/dto/webauthn.dto';
import { HttpStatus } from 'src/common/type/status.enum';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/jwt/jwt.payload';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';

const CONTEXT = 'AccountsController';

/**
 * 認証系エンドポイントのレートリミット設定
 * 通常: 1分間に5リクエストまで
 * E2E テスト環境（THROTTLE_LIMIT 環境変数あり）: 環境変数の値を使用
 */
const AUTH_THROTTLE_LIMIT = process.env.THROTTLE_LIMIT
  ? parseInt(process.env.THROTTLE_LIMIT, 10)
  : 5;
const AUTH_THROTTLE_TTL = process.env.THROTTLE_TTL
  ? parseInt(process.env.THROTTLE_TTL, 10)
  : 60000;

@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly accountService: AccountService,
    private readonly webAuthnService: WebAuthnService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * ログインエンドポイント
   * 認証成功時はJWTトークンを返す
   * レートリミット: 通常1分間に5リクエストまで（THROTTLE_LIMIT 環境変数で変更可）
   */
  @Post('login')
  @Throttle({ default: { ttl: AUTH_THROTTLE_TTL, limit: AUTH_THROTTLE_LIMIT } })
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
   * レートリミット: 通常1分間に5リクエストまで（THROTTLE_LIMIT 環境変数で変更可）
   */
  @Post('regist')
  @Throttle({ default: { ttl: AUTH_THROTTLE_TTL, limit: AUTH_THROTTLE_LIMIT } })
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

  /**
   * ログインユーザー情報取得エンドポイント
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(
    @CurrentUser() currentUser: JwtPayload,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, 'ユーザー情報取得リクエスト');
    const me = await this.accountService.getMe(currentUser.username);
    return response.status(HttpStatus.OK).json(me);
  }

  /**
   * ログインユーザーのプロフィール更新エンドポイント
   * display_name を更新して最新のユーザー情報を返す
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @CurrentUser() currentUser: JwtPayload,
    @Body() dto: UpdateMeDto,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(
      CONTEXT,
      `プロフィール更新リクエスト: ${currentUser.username}`,
    );
    const me = await this.accountService.updateMe(currentUser.username, dto);
    this.logger.log(CONTEXT, `プロフィール更新成功: ${currentUser.username}`);
    return response
      .status(HttpStatus.OK)
      .json({ ...me, message: MESSAGE.AUTH.UPDATE_ME_SUCCESS });
  }

  // ─── WebAuthn エンドポイント ───────────────────────────────────────────────

  /**
   * 顔認証登録開始
   * レートリミット: 通常1分間に5リクエストまで（THROTTLE_LIMIT 環境変数で変更可）
   */
  @Post('webauthn/registration/start')
  @Throttle({ default: { ttl: AUTH_THROTTLE_TTL, limit: AUTH_THROTTLE_LIMIT } })
  async webAuthnRegistrationStart(
    @Body() dto: WebAuthnRegistrationStartDto,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `顔認証登録開始: ${dto.username}`);
    const options = await this.webAuthnService.startRegistration(dto.username);
    return response.status(HttpStatus.OK).json(options);
  }

  /**
   * 顔認証登録完了
   * レートリミット: 通常1分間に5リクエストまで（THROTTLE_LIMIT 環境変数で変更可）
   */
  @Post('webauthn/registration/finish')
  @Throttle({ default: { ttl: AUTH_THROTTLE_TTL, limit: AUTH_THROTTLE_LIMIT } })
  async webAuthnRegistrationFinish(
    @Body() dto: WebAuthnRegistrationFinishDto,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `顔認証登録完了: ${dto.username}`);
    const result = await this.webAuthnService.finishRegistration(
      dto.username,
      dto.response as unknown as RegistrationResponseJSON,
    );
    return response
      .status(HttpStatus.OK)
      .json({ ...result, message: MESSAGE.WEBAUTHN.REGISTRATION_SUCCESS });
  }

  /**
   * 顔認証開始
   * レートリミット: 通常1分間に5リクエストまで（THROTTLE_LIMIT 環境変数で変更可）
   */
  @Post('webauthn/authentication/start')
  @Throttle({ default: { ttl: AUTH_THROTTLE_TTL, limit: AUTH_THROTTLE_LIMIT } })
  async webAuthnAuthenticationStart(
    @Body() dto: WebAuthnAuthenticationStartDto,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `顔認証開始: ${dto.username}`);
    const options = await this.webAuthnService.startAuthentication(
      dto.username,
    );
    return response.status(HttpStatus.OK).json(options);
  }

  /**
   * 顔認証完了
   * レートリミット: 通常1分間に5リクエストまで（THROTTLE_LIMIT 環境変数で変更可）
   */
  @Post('webauthn/authentication/finish')
  @Throttle({ default: { ttl: AUTH_THROTTLE_TTL, limit: AUTH_THROTTLE_LIMIT } })
  async webAuthnAuthenticationFinish(
    @Body() dto: WebAuthnAuthenticationFinishDto,
    @Res() response: Response,
  ): Promise<Response> {
    this.logger.log(CONTEXT, `顔認証認証完了: ${dto.username}`);
    const token = await this.webAuthnService.finishAuthentication(
      dto.username,
      dto.response as unknown as AuthenticationResponseJSON,
    );
    return response
      .status(HttpStatus.OK)
      .json({ token, message: MESSAGE.WEBAUTHN.AUTHENTICATION_SUCCESS });
  }
}
