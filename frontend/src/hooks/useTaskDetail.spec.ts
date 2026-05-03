import { renderHook, waitFor, act } from '@testing-library/react';
import { useTaskDetail } from './useTaskDetail';
import * as taskApi from '../api/taskApi';

jest.mock('../api/taskApi');
jest.mock('../logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockTask: taskApi.Task = {
  id: 1,
  title: 'テストタスク',
  description: 'テスト説明',
  due_date: '2026-12-31T23:59:59.000Z',
  priority: 'MEDIUM',
  category: null,
  parent_id: null,
  created_by: 'testuser',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  is_completed: false,
  closed_by: null,
  assignees: ['testuser'],
  children: [],
};

describe('useTaskDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('初期状態でローディングが true になる', () => {
    (taskApi.fetchTask as jest.Mock).mockResolvedValue(mockTask);

    const { result } = renderHook(() => useTaskDetail('1'));

    expect(result.current.loading).toBe(true);
    expect(result.current.task).toBeNull();
    expect(result.current.error).toBe('');
  });

  it('タスク取得成功後に task がセットされ loading が false になる', async () => {
    (taskApi.fetchTask as jest.Mock).mockResolvedValue(mockTask);

    const { result } = renderHook(() => useTaskDetail('1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.task).toEqual(mockTask);
    expect(result.current.error).toBe('');
  });

  it('タスク取得失敗時に error がセットされる', async () => {
    (taskApi.fetchTask as jest.Mock).mockRejectedValue(new Error('タスクが見つかりません'));

    const { result } = renderHook(() => useTaskDetail('99'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.task).toBeNull();
    expect(result.current.error).toBe('タスクが見つかりません');
  });

  it('id が undefined の場合はフェッチを実行しない', () => {
    // id が undefined の場合、useEffect は早期リターンするためフェッチは行われない
    // loading は初期値 true のまま変化しない仕様
    const { result } = renderHook(() => useTaskDetail(undefined));

    expect(taskApi.fetchTask).not.toHaveBeenCalled();
    expect(result.current.task).toBeNull();
  });

  it('handleToggleComplete で完了状態が true に切り替わる', async () => {
    (taskApi.fetchTask as jest.Mock).mockResolvedValue(mockTask);
    const completedTask = { ...mockTask, is_completed: true };
    (taskApi.toggleTaskCompletion as jest.Mock).mockResolvedValue(completedTask);

    const { result } = renderHook(() => useTaskDetail('1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleToggleComplete();
    });

    expect(taskApi.toggleTaskCompletion).toHaveBeenCalledWith(1, true);
    expect(result.current.task?.is_completed).toBe(true);
    expect(result.current.toggleCompleteError).toBe('');
  });

  it('handleToggleComplete で完了状態が false に戻る', async () => {
    const completedMock = { ...mockTask, is_completed: true };
    (taskApi.fetchTask as jest.Mock).mockResolvedValue(completedMock);
    const uncompletedTask = { ...mockTask, is_completed: false };
    (taskApi.toggleTaskCompletion as jest.Mock).mockResolvedValue(uncompletedTask);

    const { result } = renderHook(() => useTaskDetail('1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleToggleComplete();
    });

    expect(taskApi.toggleTaskCompletion).toHaveBeenCalledWith(1, false);
    expect(result.current.task?.is_completed).toBe(false);
  });

  it('handleToggleComplete 失敗時に toggleCompleteError がセットされる', async () => {
    (taskApi.fetchTask as jest.Mock).mockResolvedValue(mockTask);
    (taskApi.toggleTaskCompletion as jest.Mock).mockRejectedValue(new Error('更新失敗'));

    const { result } = renderHook(() => useTaskDetail('1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleToggleComplete();
    });

    expect(result.current.toggleCompleteError).toBe('更新失敗');
    expect(result.current.task?.is_completed).toBe(false);
  });

  it('task が null の場合は handleToggleComplete が何もしない', async () => {
    // id が undefined の場合は task = null のまま
    const { result } = renderHook(() => useTaskDetail(undefined));

    await act(async () => {
      await result.current.handleToggleComplete();
    });

    expect(taskApi.toggleTaskCompletion).not.toHaveBeenCalled();
  });
});
