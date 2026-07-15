import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import * as bcrypt from 'bcrypt';

/** bcrypt のラウンド数 */
const BCRYPT_ROUNDS = 10;

@Injectable()
export class HashService {
  /**
   * bcrypt でパスワードをハッシュ化する
   */
  async createHash(value: string): Promise<string> {
    return bcrypt.hash(value, BCRYPT_ROUNDS);
  }

  /**
   * bcrypt でパスワードを照合する
   */
  async compareHash(value: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(value, hashed);
  }

  /**
   * SHA-256 ハッシュで旧形式パスワードを照合する（移行期間用）
   */
  isLegacySha256(value: string, hashed: string): boolean {
    const sha256Hash = createHash('sha256').update(value).digest('hex');
    return sha256Hash === hashed;
  }
}
