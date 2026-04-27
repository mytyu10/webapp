import {Body, Controller, Get, Post, ValidationPipe, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AccountService } from './account.service';
import { AccountDto } from './account';
import { HttpStatus } from '../common/type/status.enum';
import { MESSAGE } from '../common/type/message'

@Controller('accounts')
export class AccountsController {
    constructor(private readonly accountService: AccountService) {};

    @Post('login')
    /**
     * ログイン機能。
     * 画面で入力したユーザーネームとパスワードをもとにログインの確認を行う。
     * ユーザーネームとパスワードの妥当性についてはservice側で確認を行う。
     */
    checkAccount(@Body(ValidationPipe) account: AccountDto, @Res() response: Response): Response {
        let result: boolean = this.accountService.login(account);

        if(result) {
            //成功した場合
            response.status(HttpStatus.NO_CONTENT).send(MESSAGE.AUTH.LOGIN_SUCCESS);

        } else {
            //失敗した場合
            response.status(HttpStatus.BAD_REQUEST).send(MESSAGE.AUTH.LOGIN_FAILED);
        }
        return response;
    }

    /**
     * アカウント登録機能。
     * 画面で入力したユーザーネームとパスワードをもとにユーザー登録を行う。
     * ユーザーネームとパスワードの妥当性についてはservice側で確認を行う。
     * 
     * @param account 
     * @param response 
     * @returns 
     */
    @Post('regist')
    registAccount(@Body(ValidationPipe) account: AccountDto, @Res() response: Response): Response {
        let result = this.accountService.regist(account);

        if(result) {
            //成功した場合
            response.status(HttpStatus.NO_CONTENT).send(MESSAGE.AUTH.REGIST_SUCCESS);

        } else {
            //失敗した場合
            response.status(HttpStatus.BAD_REQUEST).send(MESSAGE.AUTH.REGIST_FAILED);

        }

        return response;
    }

    @Get('logout')
    logout() {

    }
}
