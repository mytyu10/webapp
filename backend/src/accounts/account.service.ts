import { Injectable } from '@nestjs/common';
import { AccountDto } from './account';

type Account = {
    username: string,
    password: string,
}

@Injectable()
export class AccountService {
    login(dto: Account):boolean  {
        return true;
    }
}
