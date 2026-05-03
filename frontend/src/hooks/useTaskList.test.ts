import { renderHook, waitFor, act } from '@testing-library/react';
import { useTaskList } from './useTaskList';
import * as taskApi from '../api/taskApi';

jest.mock('../api/taskApi');
jest.mock('../logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// -----------------------------------------------------------------------
// テストデータファクトリ
// -----------------------------------------------------------------------

/** 最小限のタスクフィールドをデフォルト値付きで生成するヘルパー */
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
    assignees: [],
    children: [],
    ...overrides,
  };
}

// -----------------------------------------------------------------------
// hasPartiallyCompletedChildren のテスト
// -----------------------------------------------------------------------

describe('buildTaskTrees: hasPartiallyCompletedChildren フラグ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (taskApi.fetchCategories as jest.Mock).mockResolvedValue([]);
  });

  it('自身が未完了かつ直接の子に完了タスクが1件以上あれば true になる', async () => {
    /** 完了済みの子タスク */
    const completedChild = makeTask({
      id: 2,
      parent_id: 1,
      is_completed: true,
      children: [],
    });
    /** 未完了の親タスク（完了済み子を持つ） */
    const parentWithCompletedChild = makeTask({
      id: 1,
      is_completed: false,
      children: [completedChild],
    });

    (taskApi.fetchTasks as jest.Mock).mockResolvedValue([parentWithCompletedChild]);

    const { result } = renderHook(() => useTaskList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.incompleteTrees[0].hasPartiallyCompletedChildren).toBe(true);
  });

  it('自身が完了済みであれば hasPartiallyCompletedChildren は false になる', async () => {
    /** 完了済みの子タスク */
    const completedChild = makeTask({
      id: 2,
      parent_id: 1,
      is_completed: true,
      children: [],
    });
    /** 完了済みの親タスク（完了済み子を持つが自身も完了済み） */
    const completedParent = makeTask({
      id: 1,
      is_completed: true,
      children: [completedChild],
    });

    (taskApi.fetchTasks as jest.Mock).mockResolvedValue([completedParent]);

    const { result } = renderHook(() => useTaskList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.completedTrees[0].hasPartiallyCompletedChildren).toBe(false);
  });

  it('自身が未完了かつ子タスクがすべて未完了であれば false になる', async () => {
    /** 未完了の子タスク */
    const incompleteChild = makeTask({
      id: 2,
      parent_id: 1,
      is_completed: false,
      children: [],
    });
    /** 未完了の親タスク（未完了子のみ） */
    const parentWithIncompleteChildren = makeTask({
      id: 1,
      is_completed: false,
      children: [incompleteChild],
    });

    (taskApi.fetchTasks as jest.Mock).mockResolvedValue([parentWithIncompleteChildren]);

    const { result } = renderHook(() => useTaskList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.incompleteTrees[0].hasPartiallyCompletedChildren).toBe(false);
  });

  it('子タスクがなければ false になる', async () => {
    /** 未完了かつ子なしのタスク */
    const leafTask = makeTask({ id: 1, is_completed: false, children: [] });

    (taskApi.fetchTasks as jest.Mock).mockResolvedValue([leafTask]);

    const { result } = renderHook(() => useTaskList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.incompleteTrees[0].hasPartiallyCompletedChildren).toBe(false);
  });
});

// -----------------------------------------------------------------------
// 楽観的更新ロールバックのテスト
// -----------------------------------------------------------------------

describe('handleToggleComplete: 楽観的更新ロールバック', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (taskApi.fetchCategories as jest.Mock).mockResolvedValue([]);
  });

  it('APIが失敗した場合にタスクステートが元の値にロールバックされる', async () => {
    /** 初期状態: 未完了タスク */
    const originalTask = makeTask({ id: 1, is_completed: false });

    (taskApi.fetchTasks as jest.Mock).mockResolvedValue([originalTask]);
    (taskApi.toggleTaskCompletion as jest.Mock).mockRejectedValue(
      new Error('サーバーエラー'),
    );

    const { result } = renderHook(() => useTaskList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // API呼び出し前の状態を確認
    expect(result.current.tasks[0].is_completed).toBe(false);

    await act(async () => {
      await result.current.handleToggleComplete(1, true);
    });

    // ロールバック後は元の false に戻ること
    expect(result.current.tasks[0].is_completed).toBe(false);
  });

  it('APIが失敗した場合に toggleCompleteError にエラーメッセージがセットされる', async () => {
    const originalTask = makeTask({ id: 1, is_completed: false });

    (taskApi.fetchTasks as jest.Mock).mockResolvedValue([originalTask]);
    (taskApi.toggleTaskCompletion as jest.Mock).mockRejectedValue(
      new Error('更新に失敗しました'),
    );

    const { result } = renderHook(() => useTaskList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleToggleComplete(1, true);
    });

    expect(result.current.toggleCompleteError).toBe('更新に失敗しました');
  });

  it('APIが成功した場合はサーバーレスポンスで tasks が上書きされる', async () => {
    const originalTask = makeTask({ id: 1, is_completed: false });
    const updatedTask = makeTask({ id: 1, is_completed: true });

    (taskApi.fetchTasks as jest.Mock).mockResolvedValue([originalTask]);
    (taskApi.toggleTaskCompletion as jest.Mock).mockResolvedValue(updatedTask);

    const { result } = renderHook(() => useTaskList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleToggleComplete(1, true);
    });

    expect(result.current.tasks[0].is_completed).toBe(true);
    expect(result.current.toggleCompleteError).toBe('');
  });

  it('複数タスクがある場合に対象タスクのみがロールバックされる', async () => {
    const task1 = makeTask({ id: 1, is_completed: false });
    const task2 = makeTask({ id: 2, title: '別タスク', is_completed: false });

    (taskApi.fetchTasks as jest.Mock).mockResolvedValue([task1, task2]);
    (taskApi.toggleTaskCompletion as jest.Mock).mockRejectedValue(
      new Error('更新失敗'),
    );

    const { result } = renderHook(() => useTaskList());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleToggleComplete(1, true);
    });

    // id=1 は元の false に戻り、id=2 は変更されていない
    expect(result.current.tasks.find((t) => t.id === 1)?.is_completed).toBe(false);
    expect(result.current.tasks.find((t) => t.id === 2)?.is_completed).toBe(false);
  });
});
