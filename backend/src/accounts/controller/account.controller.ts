import {
  Body,
  Controller,
  Get,
  Post,
  ValidationPipe,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AccountService } from '../service/account.service';
import { AccountDto } from '../dto/account';
import { HttpStatus } from '../../common/type/status.enum';
import { MESSAGE } from '../../common/type/message';
import { LoggerService } from '../../common/service/logger.service';

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
   */
  @Post('login')
  async checkAccount(
    @Body(ValidationPipe) account: AccountDto,
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
    @Body(ValidationPipe) account: AccountDto,
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
}
