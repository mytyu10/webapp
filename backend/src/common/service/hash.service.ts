import { Injectable } from '@nestjs/common';
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
}
