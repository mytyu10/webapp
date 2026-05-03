import { renderHook, waitFor, act } from '@testing-library/react';
import { useTaskList } from './useTaskList';
import * as taskApi from '../api/taskApi';

jest.mock('../api/taskApi');
jest.mock('../logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

/** テスト用の未完了タスク */
const incompleteMockTask: taskApi.Task = {
  id: 1,
  title: '未完了タスク',
  description: 'テスト説明',
  due_date: '2026-12-31T23:59:59.000Z',
  priority: 'MEDIUM',
  category: 'work',
  parent_id: null,
  created_by: 'testuser',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  is_completed: false,
  assignees: [],
  children: [],
};

/** テスト用の完了済みタスク */
const completedMockTask: taskApi.Task = {
  id: 2,
  title: '完了済みタスク',
  description: 'テスト説明',
  due_date: '2026-11-30T23:59:59.000Z',
  priority: 'HIGH',
  category: 'personal',
  parent_id: null,
  created_by: 'testuser',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  is_completed: true,
  assignees: [],
  children: [],
};

/** 子タスクを持つ親タスク */
const parentTask: taskApi.Task = {
  id: 10,
  title: '親タスク',
  description: '親説明',
  due_date: '2026-12-31T23:59:59.000Z',
  priority: 'MEDIUM',
  category: null,
  parent_id: null,
  created_by: 'testuser',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  is_completed: false,
  assignees: [],
  children: [
    {
      id: 11,
      title: '子タスク',
      description: '子説明',
      due_date: '2026-12-15T23:59:59.000Z',
      priority: 'LOW',
      category: null,
      parent_id: 10,
      created_by: 'testuser',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      is_completed: false,
      assignees: [],
      children: [],
    },
  ],
};

describe('useTaskList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('初期状態でローディングが true になる', () => {
    (taskApi.fetchTasks as jest.Mock).mockResolvedValue([]);
    (taskApi.fetchCategories as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useTaskList());

    expect(result.current.loading).toBe(true);
    expect(result.current.tasks).toEqual([]);
  });

  it('タスク・カテゴリ取得成功後に state が更新される', async () => {
    (taskApi.fetchTasks as jest.Mock).mockResolvedValue([incompleteMockTask, completedMockTask]);
    (taskApi.fetchCategories as jest.Mock).mockResolvedValue(['work', 'personal']);

    const { result } = renderHook(() => useTaskList());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tasks).toHaveLength(2);
    expect(result.current.categories).toEqual(['work', 'personal']);
  });

  it('未完了タスクは incompleteTrees に含まれる', async () => {
    (taskApi.fetchTasks as jest.Mock).mockResolvedValue([incompleteMockTask, completedMockTask]);
    (taskApi.fetchCategories as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useTaskList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.incompleteTrees).toHaveLength(1);
    expect(result.current.incompleteTrees[0].id).toBe(1);
    expect(result.current.incompleteTrees[0].depth).toBe(0);
  });

  it('完了済みタスクは completedTrees に含まれる', async () => {
    (taskApi.fetchTasks as jest.Mock).mockResolvedValue([incompleteMockTask, completedMockTask]);
    (taskApi.fetchCategories as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useTaskList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.completedTrees).toHaveLength(1);
    expect(result.current.completedTrees[0].id).toBe(2);
  });

  it('子タスクが depth 1 でフラット配列に展開される', async () => {
    (taskApi.fetchTasks as jest.Mock).mockResolvedValue([parentTask]);
    (taskApi.fetchCategories as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useTaskList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.incompleteTrees).toHaveLength(2);
    expect(result.current.incompleteTrees[0].id).toBe(10);
    expect(result.current.incompleteTrees[0].depth).toBe(0);
    expect(result.current.incompleteTrees[1].id).toBe(11);
    expect(result.current.incompleteTrees[1].depth).toBe(1);
  });

  it('カテゴリフィルター適用時に一致しないタスクが除外される', async () => {
    (taskApi.fetchTasks as jest.Mock).mockResolvedValue([incompleteMockTask, completedMockTask]);
    (taskApi.fetchCategories as jest.Mock).mockResolvedValue(['work', 'personal']);

    const { result } = renderHook(() => useTaskList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setSelectedCategory('work');
    });

    expect(result.current.incompleteTrees).toHaveLength(1);
    expect(result.current.incompleteTrees[0].id).toBe(1);
  });

  it('タスク取得失敗時に error がセットされる', async () => {
    (taskApi.fetchTasks as jest.Mock).mockRejectedValue(new Error('ネットワークエラー'));
    (taskApi.fetchCategories as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useTaskList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('ネットワークエラー');
  });

  it('handleDelete でタスクが一覧から削除される', async () => {
    (taskApi.fetchTasks as jest.Mock).mockResolvedValue([incompleteMockTask, completedMockTask]);
    (taskApi.fetchCategories as jest.Mock).mockResolvedValue([]);
    (taskApi.deleteTask as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useTaskList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleDelete(1);
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].id).toBe(2);
  });

  it('handleDelete 失敗時に例外がスローされる', async () => {
    (taskApi.fetchTasks as jest.Mock).mockResolvedValue([incompleteMockTask]);
    (taskApi.fetchCategories as jest.Mock).mockResolvedValue([]);
    (taskApi.deleteTask as jest.Mock).mockRejectedValue(new Error('削除失敗'));

    const { result } = renderHook(() => useTaskList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => {
        await result.current.handleDelete(1);
      }),
    ).rejects.toThrow('削除失敗');
  });

  it('handleToggleComplete で完了状態が更新される', async () => {
    (taskApi.fetchTasks as jest.Mock).mockResolvedValue([incompleteMockTask]);
    (taskApi.fetchCategories as jest.Mock).mockResolvedValue([]);
    const updatedTask = { ...incompleteMockTask, is_completed: true };
    (taskApi.toggleTaskCompletion as jest.Mock).mockResolvedValue(updatedTask);

    const { result } = renderHook(() => useTaskList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleToggleComplete(1, true);
    });

    expect(taskApi.toggleTaskCompletion).toHaveBeenCalledWith(1, true);
    expect(result.current.tasks[0].is_completed).toBe(true);
  });

  it('handleToggleComplete 失敗時に toggleCompleteError がセットされる', async () => {
    (taskApi.fetchTasks as jest.Mock).mockResolvedValue([incompleteMockTask]);
    (taskApi.fetchCategories as jest.Mock).mockResolvedValue([]);
    (taskApi.toggleTaskCompletion as jest.Mock).mockRejectedValue(new Error('更新失敗'));

    const { result } = renderHook(() => useTaskList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleToggleComplete(1, true);
    });

    expect(result.current.toggleCompleteError).toBe('更新失敗');
    expect(result.current.tasks[0].is_completed).toBe(false);
  });

  it('reload を呼ぶと再度 fetchTasks が呼ばれる', async () => {
    (taskApi.fetchTasks as jest.Mock).mockResolvedValue([incompleteMockTask]);
    (taskApi.fetchCategories as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useTaskList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(taskApi.fetchTasks).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.reload();
    });

    await waitFor(() => expect(taskApi.fetchTasks).toHaveBeenCalledTimes(2));
  });
});
