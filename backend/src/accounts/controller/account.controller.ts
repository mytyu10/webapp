import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AccountService } from 'src/accounts/service/account.service';
import { AccountDto } from 'src/accounts/dto/account';
import { HttpStatus } from 'src/common/type/status.enum';
import { MESSAGE } from 'src/common/type/message';
import { LoggerService } from 'src/common/service/logger.service';
import { JwtAuthGuard } from 'src/jwt/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/jwt/jwt.payload';

const CONTEXT = 'AccountsController';

@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly accountService: AccountService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * ログインエンドポイント
   * 認証成功時はJWTトークンを返す
   * レートリミット: 1分間に5リクエストまで
   */
  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
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
   * レートリミット: 1分間に5リクエストまで
   */
  @Post('regist')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
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
}
