import { Test, TestingModule } from '@nestjs/testing';
import { HashService } from './hash.service';

/** bcrypt モック */
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashed'),
  compare: jest.fn().mockResolvedValue(true),
}));

import * as bcrypt from 'bcrypt';

describe('HashService', () => {
  let service: HashService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HashService],
    }).compile();

    service = module.get<HashService>(HashService);
    jest.clearAllMocks();
  });

  describe('createHash', () => {
    it('bcrypt.hash を rounds=10 で呼び出してハッシュ文字列を返す', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashed');

      const result = await service.createHash('password');

      expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
      expect(result).toBe('$2b$10$hashed');
    });

    it('ハッシュ化した文字列を返す', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$anotherhash');

      const result = await service.createHash('secret');

      expect(result).toBe('$2b$10$anotherhash');
    });
  });

  describe('compareHash', () => {
    it('bcrypt.compare を value と hashed で呼び出して真偽値を返す', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.compareHash('password', '$2b$10$hashed');

      expect(bcrypt.compare).toHaveBeenCalledWith('password', '$2b$10$hashed');
      expect(result).toBe(true);
    });

    it('パスワードが一致しない場合は false を返す', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.compareHash('wrong', '$2b$10$hashed');

      expect(result).toBe(false);
    });
  });
});
