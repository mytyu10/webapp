import {Body, Controller, Get, Post, ValidationPipe } from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountDto } from './account';

@Controller('accounts')
export class AccountsController {
    constructor(private readonly accountService: AccountService) {};

    @Post('login')
    checkAccount(@Body(ValidationPipe) account: AccountDto) {
        return this.accountService.login(account)
    }

    @Post('regist')
    registAccount(@Body(ValidationPipe) account: AccountDto) {
        return this.accountService
    }
}
