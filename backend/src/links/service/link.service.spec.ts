import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { LinkService } from './link.service';
import { LinkRepository } from '../repository/link.repository';
import { LoggerService } from 'src/common/service/logger.service';
import { MESSAGE } from 'src/common/type/message';

/** モック用フォルダデータ */
const mockFolder = {
  id: 1,
  title: 'テストフォルダ',
  url: null,
  description: '',
  type: 'FOLDER',
  parent_id: null,
  order: 0,
  created_by: 'testuser',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
};

/** モック用リンクデータ */
const mockLink = {
  id: 2,
  title: 'テストリンク',
  url: 'https://example.com',
  description: '説明',
  type: 'LINK',
  parent_id: 1,
  order: 0,
  created_by: 'testuser',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z'),
};

const mockLinkRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockLoggerService = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('LinkService', () => {
  let service: LinkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkService,
        { provide: LinkRepository, useValue: mockLinkRepository },
        { provide: LoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<LinkService>(LinkService);
    jest.clearAllMocks();
  });

  // ────────────────────────────────────────────────
  // findAll
  // ────────────────────────────────────────────────
  describe('findAll', () => {
    it('フラット配列をツリー構造に変換して返す', async () => {
      mockLinkRepository.findAll.mockResolvedValue([mockFolder, mockLink]);

      const result = await service.findAll('testuser');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].type).toBe('FOLDER');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0].id).toBe(2);
    });

    it('ルートに LINK のみある場合は children が空配列である', async () => {
      const rootLink = { ...mockLink, parent_id: null };
      mockLinkRepository.findAll.mockResolvedValue([rootLink]);

      const result = await service.findAll('testuser');

      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(0);
    });

    it('空の場合は空配列を返す', async () => {
      mockLinkRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll('testuser');

      expect(result).toHaveLength(0);
    });
  });

  // ────────────────────────────────────────────────
  // create
  // ────────────────────────────────────────────────
  describe('create', () => {
    it('LINK タイプで url が未指定の場合は BadRequestException をスローする', async () => {
      await expect(
        service.create({ title: 'リンク', type: 'LINK' }, 'testuser'),
      ).rejects.toThrow(BadRequestException);
    });

    it('LINK タイプで url が未指定の場合のエラーメッセージを確認する', async () => {
      try {
        await service.create({ title: 'リンク', type: 'LINK' }, 'testuser');
      } catch (err) {
        expect((err as BadRequestException).message).toBe(
          MESSAGE.LINK.URL_REQUIRED,
        );
      }
    });

    it('parent_id が指定されているが FOLDER でない場合は BadRequestException をスローする', async () => {
      // findById が LINK を返す（FOLDERではない）
      mockLinkRepository.findById.mockResolvedValue(mockLink);

      await expect(
        service.create(
          {
            title: '子リンク',
            type: 'LINK',
            url: 'https://example.com',
            parent_id: 2,
          },
          'testuser',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('parent_id が存在しない場合は NotFoundException をスローする', async () => {
      mockLinkRepository.findById.mockResolvedValue(null);

      await expect(
        service.create(
          {
            title: '子リンク',
            type: 'LINK',
            url: 'https://example.com',
            parent_id: 999,
          },
          'testuser',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('正常なFOLDER作成時はリポジトリを呼び出してDTOを返す', async () => {
      mockLinkRepository.create.mockResolvedValue(mockFolder);

      const result = await service.create(
        { title: 'テストフォルダ', type: 'FOLDER' },
        'testuser',
      );

      expect(mockLinkRepository.create).toHaveBeenCalled();
      expect(result.id).toBe(1);
      expect(result.type).toBe('FOLDER');
    });

    it('正常なLINK作成時はリポジトリを呼び出してDTOを返す', async () => {
      mockLinkRepository.create.mockResolvedValue(mockLink);

      const result = await service.create(
        { title: 'テストリンク', type: 'LINK', url: 'https://example.com' },
        'testuser',
      );

      expect(result.id).toBe(2);
      expect(result.url).toBe('https://example.com');
    });

    it('リポジトリがエラーをスローした場合は InternalServerErrorException をスローする', async () => {
      mockLinkRepository.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.create({ title: 'フォルダ', type: 'FOLDER' }, 'testuser'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ────────────────────────────────────────────────
  // update
  // ────────────────────────────────────────────────
  describe('update', () => {
    it('存在しない ID の場合は NotFoundException をスローする', async () => {
      mockLinkRepository.findById.mockResolvedValue(null);

      await expect(service.update(999, { title: '更新後' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('正常時はリポジトリを呼び出して更新後のDTOを返す', async () => {
      mockLinkRepository.findById.mockResolvedValue(mockFolder);
      const updatedFolder = { ...mockFolder, title: '更新後' };
      mockLinkRepository.update.mockResolvedValue(updatedFolder);

      const result = await service.update(1, { title: '更新後' });

      expect(mockLinkRepository.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ title: '更新後' }),
      );
      expect(result.title).toBe('更新後');
    });

    it('リポジトリがエラーをスローした場合は InternalServerErrorException をスローする', async () => {
      mockLinkRepository.findById.mockResolvedValue(mockFolder);
      mockLinkRepository.update.mockRejectedValue(new Error('DB error'));

      await expect(service.update(1, { title: '更新後' })).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  // ────────────────────────────────────────────────
  // delete
  // ────────────────────────────────────────────────
  describe('delete', () => {
    it('存在しない ID の場合は NotFoundException をスローする', async () => {
      mockLinkRepository.findById.mockResolvedValue(null);

      await expect(service.delete(999, 'testuser')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('正常時はリポジトリの delete を呼び出す', async () => {
      mockLinkRepository.findById.mockResolvedValue(mockFolder);
      mockLinkRepository.delete.mockResolvedValue(undefined);

      await service.delete(1, 'testuser');

      expect(mockLinkRepository.delete).toHaveBeenCalledWith(1);
    });

    it('リポジトリがエラーをスローした場合は InternalServerErrorException をスローする', async () => {
      mockLinkRepository.findById.mockResolvedValue(mockFolder);
      mockLinkRepository.delete.mockRejectedValue(new Error('DB error'));

      await expect(service.delete(1, 'testuser')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
