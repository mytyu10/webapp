import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AccountDto } from '../dto/account';
import { AccountMeResponseDto, UpdateMeDto } from '../dto/account.dto';
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
   * bcrypt でパスワードを照合し、一致した場合に JWT を発行する。
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

    const isBcryptMatch = await this.hashService.compareHash(
      dto.password,
      account.hashed_password,
    );

    if (isBcryptMatch) {
      this.logger.log(CONTEXT, `認証成功: ${dto.username}`);
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
      display_name: account.display_name,
    };
  }

  /**
   * ログインユーザーのプロフィールを更新する
   * display_name のみ更新可能
   */
  async updateMe(
    username: string,
    dto: UpdateMeDto,
  ): Promise<AccountMeResponseDto> {
    this.logger.log(CONTEXT, `プロフィール更新: ${username}`);

    try {
      const updated = await this.accountRepository.updateDisplayName(
        username,
        dto.display_name,
      );
      return {
        username: updated.username,
        display_name: updated.display_name,
      };
    } catch (error) {
      this.logger.warn(
        CONTEXT,
        `プロフィール更新エラー: ${username} - ${String(error)}`,
      );
      throw new InternalServerErrorException(MESSAGE.AUTH.UPDATE_ME_FAILED);
    }
  }
}
