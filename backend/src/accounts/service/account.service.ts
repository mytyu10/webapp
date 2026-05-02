import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AccountDto } from '../dto/account';
import { HashService } from '../../common/service/hash.service';
import { STRING_CONSTANTS } from 'src/common/type/string.constants';
import { AccountRepository } from '../repository/account.repository';
import { JwtService } from 'src/jwt/jwt.service';
import { LoggerService } from 'src/common/service/logger.service';
import { MESSAGE } from 'src/common/type/message';

/** アカウント登録の結果を表す型 */
type RegistResult = 'success' | 'duplicate';

const CONTEXT = 'AccountService';

@Injectable()
export class AccountService {
  constructor(
    private readonly hashService: HashService,
    private readonly accountRepository: AccountRepository,
    private readonly jwtService: JwtService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * ログイン処理
   * パスワードをハッシュ化してDBと照合し、一致すればJWTトークンを返す
   */
  async login(dto: AccountDto): Promise<string | null> {
    this.logger.log(CONTEXT, `ログイン処理開始: ${dto.username}`);

    const hashedInput = dto.password
      ? this.hashService.createHash(dto.password)
      : STRING_CONSTANTS.EMPTY;

    const account = await this.accountRepository.getAccount(dto.username);

    if (!account || hashedInput !== account.hashed_password) {
      this.logger.warn(CONTEXT, `認証失敗: ${dto.username}`);
      return null;
    }

    this.logger.log(CONTEXT, `認証成功: ${dto.username}`);
    return this.jwtService.createToken({ username: dto.username });
  }

  /**
   * アカウント登録処理
   * ユーザー名の重複確認後、パスワードをハッシュ化してDBに保存する
   */
  async regist(dto: AccountDto): Promise<RegistResult> {
    this.logger.log(CONTEXT, `アカウント登録処理開始: ${dto.username}`);

    const existing = await this.accountRepository.getAccount(dto.username);
    if (existing) {
      this.logger.warn(CONTEXT, `ユーザー名重複: ${dto.username}`);
      return 'duplicate';
    }

    const hashed_password = this.hashService.createHash(dto.password);

    try {
      await this.accountRepository.createUser({
        username: dto.username,
        hashed_password,
      });
    } catch (error) {
      this.logger.warn(
        CONTEXT,
        `DB書き込みエラー: ${dto.username} - ${String(error)}`,
      );
      throw new InternalServerErrorException(MESSAGE.DB.DB_ERROR);
    }

    this.logger.log(CONTEXT, `アカウント登録完了: ${dto.username}`);
    return 'success';
  }
}
