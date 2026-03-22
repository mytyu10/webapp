import {Body, Controller, Get, Post, ValidationPipe, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AccountService } from './account.service';
import { AccountDto } from './account';
import { HttpStatus } from './../common/status.enum';
import { MESSAGE } from './../common/message'

@Controller('accounts')
export class AccountsController {
    constructor(private readonly accountService: AccountService) {};

    @Post('login')
    checkAccount(@Body(ValidationPipe) account: AccountDto, @Res() response: Response) {
        let result: boolean = this.accountService.login(account);

        if(result) {
            //成功した場合
            response.status(HttpStatus.NO_CONTENT).send(MESSAGE.AUTH.LOGIN_SUCCESS);

        } else {
            //失敗した場合
            response.status(HttpStatus.BAD_REQUEST).send(MESSAGE.AUTH.LOGIN_FAILED);

        }
    }

    @Post('regist')
    registAccount(@Body(ValidationPipe) account: AccountDto, @Res() response: Response) {
        let result = this.accountService.regist(account);

        if(result) {
            //成功した場合
            response.status(HttpStatus.NO_CONTENT).send(MESSAGE.AUTH.REGIST_SUCCESS);

        } else {
            //失敗した場合
            response.status(HttpStatus.BAD_REQUEST).send(MESSAGE.AUTH.REGIST_FAILED);

        }
    }

    @Get('logout')
    logout() {
        
    }
}
