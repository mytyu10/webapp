import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AccountDto } from '../dto/account';
import { AccountMeResponseDto } from '../dto/account.dto';
import { HashService } from '../../common/service/hash.service';
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
   * bcrypt で照合し、失敗時は SHA-256 フォールバックで旧形式パスワードを確認する。
   * SHA-256 で一致した場合は bcrypt で再ハッシュして DB を更新する（移行ロジック）。
   */
  async login(dto: AccountDto): Promise<string | null> {
    this.logger.log(CONTEXT, `ログイン処理開始: ${dto.username}`);

    if (!dto.password) {
      this.logger.warn(
        CONTEXT,
        `認証失敗（パスワード未入力）: ${dto.username}`,
      );
      return null;
    }

    const account = await this.accountRepository.getAccount(dto.username);

    if (!account) {
      this.logger.warn(CONTEXT, `認証失敗（ユーザー不存在）: ${dto.username}`);
      return null;
    }

    // bcrypt で照合する
    const isBcryptMatch = await this.hashService.compareHash(
      dto.password,
      account.hashed_password,
    );

    if (isBcryptMatch) {
      this.logger.log(CONTEXT, `認証成功（bcrypt）: ${dto.username}`);
      return this.jwtService.createToken({ username: dto.username });
    }

    // SHA-256 フォールバック（旧形式パスワードの移行）
    const isLegacyMatch = this.hashService.isLegacySha256(
      dto.password,
      account.hashed_password,
    );

    if (isLegacyMatch) {
      this.logger.log(
        CONTEXT,
        `旧形式パスワード一致。bcrypt に再ハッシュして更新: ${dto.username}`,
      );
      const newHash = await this.hashService.createHash(dto.password);
      await this.accountRepository.updateHashedPassword(dto.username, newHash);
      this.logger.log(CONTEXT, `bcrypt 移行完了: ${dto.username}`);
      return this.jwtService.createToken({ username: dto.username });
    }

    this.logger.warn(CONTEXT, `認証失敗: ${dto.username}`);
    return null;
  }

  /**
   * アカウント登録処理
   * ユーザー名の重複確認後、パスワードを bcrypt でハッシュ化してDBに保存する
   */
  async regist(dto: AccountDto): Promise<RegistResult> {
    this.logger.log(CONTEXT, `アカウント登録処理開始: ${dto.username}`);

    const existing = await this.accountRepository.getAccount(dto.username);
    if (existing) {
      this.logger.warn(CONTEXT, `ユーザー名重複: ${dto.username}`);
      return 'duplicate';
    }

    const hashed_password = await this.hashService.createHash(dto.password);

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

  /**
   * ログインユーザー情報を取得する
   */
  async getMe(username: string): Promise<AccountMeResponseDto> {
    this.logger.log(CONTEXT, `ユーザー情報取得: ${username}`);
    const account = await this.accountRepository.getAccount(username);
    if (!account) {
      throw new InternalServerErrorException(MESSAGE.AUTH.ME_FETCH_FAILED);
    }
    return {
      username: account.username,
    };
  }
}
