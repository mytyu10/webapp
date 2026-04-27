import { Injectable } from '@nestjs/common';
import { AccountDto } from './account';
import { HashService } from '../common/service/hash.service';
import { STRING_CONSTANTS } from 'src/common/type/string.constants';

@Injectable()

/**
 * アカウントに関連するservice
 */
export class AccountService {

    constructor(private readonly hashService: HashService){

    }
    
    /**
     * login機能。database側ではhash値を保持しているので、入力されたパスワードをhash値に変換してdatabaseに保持しているものと突合する。
     * @param dto 画面で入力した情報を持つdto
     * @returns ログインの結果
     */
    login(dto: AccountDto):boolean  {
        // dto.passwordに値があればhash化実行。そうでなければ空文字返却。
        const hashed_password = dto.password ? this.hashService.createHash(dto.password) : STRING_CONSTANTS.EMPTY;

        // ToDo AccountRepositoryを作成してそこからusernameをkeyにパスワードのhash値だけ取得。それとhashed_passwordを比較してログイン可否を返却すること。
        
        return true;
    }

    regist(dto: AccountDto):boolean {
        return true;
    }
}
