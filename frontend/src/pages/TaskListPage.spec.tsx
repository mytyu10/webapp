import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TaskListPage from './TaskListPage';
import * as taskApi from '../api/taskApi';
import { TaskTreeNode } from '../hooks/useTaskList';

// -----------------------------------------------------------------------
// モック設定
// -----------------------------------------------------------------------

jest.mock('react-router-dom');

jest.mock('../api/taskApi', () => ({
  ...jest.requireActual('../api/taskApi'),
  getCurrentUsername: jest.fn(),
  fetchTasks: jest.fn(),
  fetchCategories: jest.fn(),
  deleteTask: jest.fn(),
  toggleTaskCompletion: jest.fn(),
}));

jest.mock('../logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// -----------------------------------------------------------------------
// isNodeHidden: コンポーネント外定義と同一ロジックをここで再定義して単体テスト
// -----------------------------------------------------------------------

/**
 * TaskListPage.tsx 内の isNodeHidden と同一ロジックのコピー。
 * コンポーネントスコープの純粋関数を直接エクスポートできないため、
 * 仕様を確認する目的でここで再定義する。
 */
function isNodeHidden(
  node: TaskTreeNode,
  allNodes: TaskTreeNode[],
  collapsed: Set<number>,
): boolean {
  if (node.depth === 0) return false;
  if (node.parent_id !== null && collapsed.has(node.parent_id)) return true;
  const parent = allNodes.find((n) => n.id === node.parent_id);
  if (!parent) return false;
  return isNodeHidden(parent, allNodes, collapsed);
}

// -----------------------------------------------------------------------
// テストデータファクトリ
// -----------------------------------------------------------------------

/** TaskTreeNode の最小構成を生成するヘルパー */
function makeNode(overrides: Partial<TaskTreeNode>): TaskTreeNode {
  return {
    id: 1,
    title: 'タスク',
    description: '説明',
    due_date: '2026-12-31T23:59:59.000Z',
    priority: 'MEDIUM',
    category: null,
    parent_id: null,
    created_by: 'testuser',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    is_completed: false,
    closed_by: null,
    assignees: [],
    children: [],
    depth: 0,
    hasPartiallyCompletedChildren: false,
    ...overrides,
  };
}

/** taskApi.Task の最小構成を生成するヘルパー */
function makeTask(overrides: Partial<taskApi.Task>): taskApi.Task {
  return {
    id: 1,
    title: 'タスク',
    description: '説明',
    due_date: '2026-12-31T23:59:59.000Z',
    priority: 'MEDIUM',
    category: null,
    parent_id: null,
    created_by: 'testuser',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    is_completed: false,
    closed_by: null,
    assignees: [],
    children: [],
    ...overrides,
  };
}

// -----------------------------------------------------------------------
// isNodeHidden 単体テスト
// -----------------------------------------------------------------------

describe('isNodeHidden', () => {
  describe('depth === 0 のノード', () => {
    it('collapsed に parent_id が含まれていても false を返す', () => {
      const node = makeNode({ id: 1, depth: 0, parent_id: null });
      const collapsed = new Set<number>([1]);

      expect(isNodeHidden(node, [node], collapsed)).toBe(false);
    });

    it('collapsed が空でも false を返す', () => {
      const node = makeNode({ id: 1, depth: 0, parent_id: null });
      const collapsed = new Set<number>();

      expect(isNodeHidden(node, [node], collapsed)).toBe(false);
    });
  });

  describe('depth === 1 のノード（直接の親チェック）', () => {
    it('parent_id が collapsed に含まれる場合 true を返す', () => {
      const parent = makeNode({ id: 10, depth: 0, parent_id: null });
      const child = makeNode({ id: 11, depth: 1, parent_id: 10 });
      const allNodes = [parent, child];
      const collapsed = new Set<number>([10]);

      expect(isNodeHidden(child, allNodes, collapsed)).toBe(true);
    });

    it('parent_id が collapsed に含まれない場合 false を返す', () => {
      const parent = makeNode({ id: 10, depth: 0, parent_id: null });
      const child = makeNode({ id: 11, depth: 1, parent_id: 10 });
      const allNodes = [parent, child];
      const collapsed = new Set<number>();

      expect(isNodeHidden(child, allNodes, collapsed)).toBe(false);
    });

    it('collapsed に別の ID のみ含まれる場合 false を返す', () => {
      const parent = makeNode({ id: 10, depth: 0, parent_id: null });
      const child = makeNode({ id: 11, depth: 1, parent_id: 10 });
      const allNodes = [parent, child];
      const collapsed = new Set<number>([99]);

      expect(isNodeHidden(child, allNodes, collapsed)).toBe(false);
    });
  });

  describe('depth === 2 のノード（祖先チェーンの再帰）', () => {
    it('祖父ノード（depth 0）が collapsed に含まれる場合 true を返す', () => {
      const grandParent = makeNode({ id: 10, depth: 0, parent_id: null });
      const parent = makeNode({ id: 11, depth: 1, parent_id: 10 });
      const child = makeNode({ id: 12, depth: 2, parent_id: 11 });
      const allNodes = [grandParent, parent, child];
      // 祖父を折りたたむ
      const collapsed = new Set<number>([10]);

      expect(isNodeHidden(child, allNodes, collapsed)).toBe(true);
    });

    it('直接の親（depth 1）が collapsed に含まれる場合 true を返す', () => {
      const grandParent = makeNode({ id: 10, depth: 0, parent_id: null });
      const parent = makeNode({ id: 11, depth: 1, parent_id: 10 });
      const child = makeNode({ id: 12, depth: 2, parent_id: 11 });
      const allNodes = [grandParent, parent, child];
      // 直接の親を折りたたむ
      const collapsed = new Set<number>([11]);

      expect(isNodeHidden(child, allNodes, collapsed)).toBe(true);
    });

    it('祖先が collapsed に含まれない場合 false を返す', () => {
      const grandParent = makeNode({ id: 10, depth: 0, parent_id: null });
      const parent = makeNode({ id: 11, depth: 1, parent_id: 10 });
      const child = makeNode({ id: 12, depth: 2, parent_id: 11 });
      const allNodes = [grandParent, parent, child];
      const collapsed = new Set<number>();

      expect(isNodeHidden(child, allNodes, collapsed)).toBe(false);
    });
  });

  describe('parent が allNodes に存在しない場合', () => {
    it('depth > 0 かつ parent が見つからない場合 false を返す', () => {
      // parent_id=99 のノードは allNodes に含まれていない
      const orphan = makeNode({ id: 5, depth: 1, parent_id: 99 });
      const allNodes = [orphan];
      const collapsed = new Set<number>();

      expect(isNodeHidden(orphan, allNodes, collapsed)).toBe(false);
    });
  });
});

// -----------------------------------------------------------------------
// TaskListPage 統合テスト
// -----------------------------------------------------------------------

describe('TaskListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (taskApi.getCurrentUsername as jest.Mock).mockReturnValue('testuser');
    (taskApi.fetchCategories as jest.Mock).mockResolvedValue([]);
  });

  describe('初期表示', () => {
    it('タスクがない場合「タスクがありません。」を表示する', async () => {
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([]);

      render(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByText('タスクがありません。')).toBeInTheDocument();
      });
    });

    it('ローディング中は「読み込み中...」を表示する', () => {
      (taskApi.fetchTasks as jest.Mock).mockReturnValue(new Promise(() => {}));

      render(<TaskListPage />);

      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    it('タスク一覧取得後にタスクタイトルが表示される', async () => {
      const task = makeTask({ id: 1, title: '表示テストタスク' });
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([task]);

      render(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByText('表示テストタスク')).toBeInTheDocument();
      });
    });
  });

  describe('子タスクトグル表示機能', () => {
    it('子タスクを持つ親タスクにトグルボタンが表示される', async () => {
      const child = makeTask({ id: 2, parent_id: 1, title: '子タスク', children: [] });
      const parent = makeTask({ id: 1, title: '親タスク', children: [child] });
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([parent]);

      render(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByText('親タスク')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: '子タスクの表示切り替え' })).toBeInTheDocument();
    });

    it('子タスクを持たない親タスクにはトグルボタンが表示されない', async () => {
      const task = makeTask({ id: 1, title: 'リーフタスク', children: [] });
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([task]);

      render(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByText('リーフタスク')).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: '子タスクの表示切り替え' })).not.toBeInTheDocument();
    });

    it('初期状態では子タスクが表示されている', async () => {
      const child = makeTask({ id: 2, parent_id: 1, title: '子タスク表示確認', children: [] });
      const parent = makeTask({ id: 1, title: '親タスク', children: [child] });
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([parent]);

      render(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByText('子タスク表示確認')).toBeInTheDocument();
      });
    });

    it('トグルボタンをクリックすると子タスクが非表示になる', async () => {
      const child = makeTask({ id: 2, parent_id: 1, title: '子タスク折りたたみ', children: [] });
      const parent = makeTask({ id: 1, title: '親タスク', children: [child] });
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([parent]);

      render(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByText('子タスク折りたたみ')).toBeInTheDocument();
      });

      const toggleButton = screen.getByRole('button', { name: '子タスクの表示切り替え' });
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.queryByText('子タスク折りたたみ')).not.toBeInTheDocument();
      });
    });

    it('トグルボタンを2回クリックすると子タスクが再表示される', async () => {
      const child = makeTask({ id: 2, parent_id: 1, title: '子タスク再表示', children: [] });
      const parent = makeTask({ id: 1, title: '親タスク', children: [child] });
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([parent]);

      render(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByText('子タスク再表示')).toBeInTheDocument();
      });

      const toggleButton = screen.getByRole('button', { name: '子タスクの表示切り替え' });

      // 1回目クリック: 折りたたむ
      fireEvent.click(toggleButton);
      await waitFor(() => {
        expect(screen.queryByText('子タスク再表示')).not.toBeInTheDocument();
      });

      // 2回目クリック: 展開する
      fireEvent.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByText('子タスク再表示')).toBeInTheDocument();
      });
    });

    it('親タスクを折りたたむと孫タスクも非表示になる', async () => {
      const grandChild = makeTask({
        id: 3,
        parent_id: 2,
        title: '孫タスク',
        children: [],
      });
      const child = makeTask({
        id: 2,
        parent_id: 1,
        title: '子タスク',
        children: [grandChild],
      });
      const parent = makeTask({ id: 1, title: '親タスク', children: [child] });
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([parent]);

      render(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByText('孫タスク')).toBeInTheDocument();
      });

      // 親タスクのトグルボタンをクリック（最初の「子タスクの表示切り替え」ボタン）
      const toggleButtons = screen.getAllByRole('button', { name: '子タスクの表示切り替え' });
      fireEvent.click(toggleButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText('孫タスク')).not.toBeInTheDocument();
      });
    });
  });

  describe('完了済みセクション', () => {
    it('完了済みタスクは「完了済み」セクションに表示される', async () => {
      const completedTask = makeTask({
        id: 1,
        title: '完了済みタスク',
        is_completed: true,
        children: [],
      });
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([completedTask]);

      render(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByText('完了済みタスク')).toBeInTheDocument();
      });
    });

    it('完了済みセクションのトグルで完了タスクが折りたたまれる', async () => {
      const completedTask = makeTask({
        id: 1,
        title: '完了折りたたみテスト',
        is_completed: true,
        children: [],
      });
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([completedTask]);

      render(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByText('完了折りたたみテスト')).toBeInTheDocument();
      });

      // 完了済みセクションのトグルボタン（▾ / ▸ ボタン）
      const sectionToggle = screen.getByRole('button', { name: /完了済み/i });
      fireEvent.click(sectionToggle);

      await waitFor(() => {
        expect(screen.queryByText('完了折りたたみテスト')).not.toBeInTheDocument();
      });
    });
  });

  describe('カテゴリフィルタリング', () => {
    it('カテゴリが存在する場合フィルターボタンが表示される', async () => {
      const task = makeTask({ id: 1, title: 'タスク', category: 'work' });
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([task]);
      (taskApi.fetchCategories as jest.Mock).mockResolvedValue(['work']);

      render(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'work' })).toBeInTheDocument();
      });
    });

    it('カテゴリフィルターをクリックすると「すべて」ボタンも表示される', async () => {
      const task = makeTask({ id: 1, title: 'タスク', category: 'work' });
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([task]);
      (taskApi.fetchCategories as jest.Mock).mockResolvedValue(['work']);

      render(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'すべて' })).toBeInTheDocument();
      });
    });
  });

  describe('作成者によるボタン表示制御', () => {
    it('自分が作成者の場合は編集・削除ボタンが表示される', async () => {
      (taskApi.getCurrentUsername as jest.Mock).mockReturnValue('owner');
      const task = makeTask({ id: 1, title: '自分のタスク', created_by: 'owner' });
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([task]);

      render(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
      });
    });

    it('他者が作成者の場合は編集ボタンは表示されるが削除ボタンは表示されない', async () => {
      (taskApi.getCurrentUsername as jest.Mock).mockReturnValue('viewer');
      const task = makeTask({ id: 1, title: '他者のタスク', created_by: 'owner' });
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([task]);

      render(<TaskListPage />);

      await waitFor(() => {
        expect(screen.getByText('他者のタスク')).toBeInTheDocument();
      });

      // 編集ボタンはログインユーザーに関わらず常時表示する
      expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument();
      // 削除ボタンは作成者のみ表示する
      expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument();
    });
  });
});
