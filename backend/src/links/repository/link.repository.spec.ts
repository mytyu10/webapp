import { Test, TestingModule } from '@nestjs/testing';
import { LinkRepository } from './link.repository';
import { PrismaService } from 'src/prisma/prisma.service';

/** モック用リンクアイテムデータ */
const mockLinkItem = {
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

/** PrismaService のモック */
const mockPrismaService = {
  linkItem: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('LinkRepository', () => {
  let repository: LinkRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinkRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    repository = module.get<LinkRepository>(LinkRepository);
    jest.clearAllMocks();
  });

  // ────────────────────────────────────────────────
  // findAll
  // ────────────────────────────────────────────────
  describe('findAll', () => {
    it('prisma.linkItem.findMany を OR 条件と orderBy で呼び出す', async () => {
      mockPrismaService.linkItem.findMany.mockResolvedValue([mockLinkItem]);

      await repository.findAll('testuser');

      expect(mockPrismaService.linkItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { created_by: 'testuser' },
              { permissions: { some: { username: 'testuser' } } },
            ],
          },
          orderBy: [{ order: 'asc' }, { created_at: 'asc' }],
        }),
      );
    });

    it('リンクアイテム一覧を返す', async () => {
      mockPrismaService.linkItem.findMany.mockResolvedValue([mockLinkItem]);

      const result = await repository.findAll('testuser');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('アイテムが存在しない場合は空配列を返す', async () => {
      mockPrismaService.linkItem.findMany.mockResolvedValue([]);

      const result = await repository.findAll('testuser');

      expect(result).toHaveLength(0);
    });
  });

  // ────────────────────────────────────────────────
  // findById
  // ────────────────────────────────────────────────
  describe('findById', () => {
    it('prisma.linkItem.findUnique を id で呼び出す', async () => {
      mockPrismaService.linkItem.findUnique.mockResolvedValue(mockLinkItem);

      await repository.findById(1);

      expect(mockPrismaService.linkItem.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('指定IDのアイテムを返す', async () => {
      mockPrismaService.linkItem.findUnique.mockResolvedValue(mockLinkItem);

      const result = await repository.findById(1);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
    });

    it('存在しない場合は null を返す', async () => {
      mockPrismaService.linkItem.findUnique.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  // ────────────────────────────────────────────────
  // create
  // ────────────────────────────────────────────────
  describe('create', () => {
    it('prisma.linkItem.create を正しいデータで呼び出す', async () => {
      mockPrismaService.linkItem.create.mockResolvedValue(mockLinkItem);

      const data = {
        title: 'テストフォルダ',
        url: null,
        description: '',
        type: 'FOLDER' as const,
        parent_id: null,
        order: 0,
        created_by: 'testuser',
      };
      await repository.create(data);

      expect(mockPrismaService.linkItem.create).toHaveBeenCalledWith({
        data,
      });
    });

    it('作成されたアイテムを返す', async () => {
      mockPrismaService.linkItem.create.mockResolvedValue(mockLinkItem);

      const result = await repository.create({
        title: 'テストフォルダ',
        url: null,
        description: '',
        type: 'FOLDER',
        parent_id: null,
        order: 0,
        created_by: 'testuser',
      });

      expect(result.id).toBe(1);
      expect(result.type).toBe('FOLDER');
    });
  });

  // ────────────────────────────────────────────────
  // update
  // ────────────────────────────────────────────────
  describe('update', () => {
    it('title のみ指定した場合は title のみ更新される', async () => {
      const updated = { ...mockLinkItem, title: '更新後' };
      mockPrismaService.linkItem.update.mockResolvedValue(updated);

      await repository.update(1, { title: '更新後' });

      expect(mockPrismaService.linkItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({ title: '更新後' }),
        }),
      );
    });

    it('更新後のアイテムを返す', async () => {
      const updated = { ...mockLinkItem, title: '更新後' };
      mockPrismaService.linkItem.update.mockResolvedValue(updated);

      const result = await repository.update(1, { title: '更新後' });

      expect(result.title).toBe('更新後');
    });
  });

  // ────────────────────────────────────────────────
  // delete
  // ────────────────────────────────────────────────
  describe('delete', () => {
    it('prisma.linkItem.delete を id で呼び出す', async () => {
      mockPrismaService.linkItem.delete.mockResolvedValue(mockLinkItem);

      await repository.delete(1);

      expect(mockPrismaService.linkItem.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });
  });
});
