import { renderHook, waitFor, act } from '@testing-library/react';
import { useCalendar } from './useCalendar';
import * as eventApi from '../api/eventApi';
import * as taskApi from '../api/taskApi';

jest.mock('../api/eventApi');
jest.mock('../api/taskApi');
jest.mock('../logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

/** テスト用カレンダー予定 */
const mockEvent: eventApi.CalendarEvent = {
  id: 1,
  title: 'ミーティング',
  description: '週次定例',
  start_at: '2026-05-04T10:00:00.000Z',
  end_at: '2026-05-04T11:00:00.000Z',
  color: 'cyan',
  repeat_group_id: null,
  created_by: 'testuser',
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-01T00:00:00.000Z',
};

/** テスト用の未完了タスク */
const incompleteTask: taskApi.Task = {
  id: 10,
  title: '未完了タスク',
  description: 'テスト説明',
  due_date: '2026-05-04T15:00:00.000Z',
  priority: 'MEDIUM',
  category: 'work',
  parent_id: null,
  created_by: 'testuser',
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-01T00:00:00.000Z',
  is_completed: false,
  closed_by: null,
  assignees: [],
  children: [],
};

/** テスト用の完了済みタスク */
const completedTask: taskApi.Task = {
  id: 11,
  title: '完了済みタスク',
  description: 'テスト説明',
  due_date: '2026-05-04T09:00:00.000Z',
  priority: 'LOW',
  category: null,
  parent_id: null,
  created_by: 'testuser',
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-01T00:00:00.000Z',
  is_completed: true,
  closed_by: 'testuser',
  assignees: [],
  children: [],
};

describe('useCalendar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (taskApi.getCurrentUsername as jest.Mock).mockReturnValue('testuser');
  });

  it('初期状態でローディングが true になる', () => {
    (eventApi.fetchEvents as jest.Mock).mockResolvedValue([]);
    // 初期ビューは dayGridMonth なので fetchTasks は呼ばれない

    const { result } = renderHook(() => useCalendar());

    expect(result.current.loading).toBe(true);
    expect(result.current.events).toEqual([]);
  });

  it('予定取得成功後に state が更新される（dayGridMonthビュー）', async () => {
    (eventApi.fetchEvents as jest.Mock).mockResolvedValue([mockEvent]);

    const { result } = renderHook(() => useCalendar());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].id).toBe(1);
    // dayGridMonth では fetchTasks は呼ばれない
    expect(taskApi.fetchTasks).not.toHaveBeenCalled();
  });

  it('データ取得失敗時に error がセットされる', async () => {
    (eventApi.fetchEvents as jest.Mock).mockRejectedValue(new Error('ネットワークエラー'));

    const { result } = renderHook(() => useCalendar());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('ネットワークエラー');
  });

  describe('calendarEvents（FullCalendar用イベント配列）', () => {
    it('dayGridMonthビューではタスクを含めず予定のみを返す', async () => {
      (eventApi.fetchEvents as jest.Mock).mockResolvedValue([mockEvent]);

      const { result } = renderHook(() => useCalendar());

      await waitFor(() => expect(result.current.loading).toBe(false));

      // 初期ビューは dayGridMonth
      expect(result.current.currentView).toBe('dayGridMonth');
      expect(result.current.calendarEvents).toHaveLength(1);
      expect(result.current.calendarEvents[0].id).toBe('event-1');
      // fetchTasks は呼ばれない
      expect(taskApi.fetchTasks).not.toHaveBeenCalled();
    });

    it('timeGridWeekビューでもタスクを含めない', async () => {
      (eventApi.fetchEvents as jest.Mock).mockResolvedValue([mockEvent]);

      const { result } = renderHook(() => useCalendar());

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setCurrentView('timeGridWeek');
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.calendarEvents).toHaveLength(1);
      expect(result.current.calendarEvents[0].id).toBe('event-1');
      // timeGridWeek でも fetchTasks は呼ばれない
      expect(taskApi.fetchTasks).not.toHaveBeenCalled();
    });

    it('timeGridDayビューでは予定とタスクの両方を含む', async () => {
      (eventApi.fetchEvents as jest.Mock).mockResolvedValue([mockEvent]);
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([incompleteTask]);

      const { result } = renderHook(() => useCalendar());

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setCurrentView('timeGridDay');
      });

      // timeGridDay に切り替わると再度 loadData が実行される
      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.calendarEvents).toHaveLength(2);
      const ids = result.current.calendarEvents.map((e) => e.id);
      expect(ids).toContain('event-1');
      expect(ids).toContain('task-10');
    });
  });

  describe('taskToEventInput — start/end の時刻変換', () => {
    beforeEach(() => {
      (eventApi.fetchEvents as jest.Mock).mockResolvedValue([]);
    });

    it('タスクの end が due_date と一致する（期限が終了時刻）', async () => {
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([incompleteTask]);

      const { result } = renderHook(() => useCalendar());

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setCurrentView('timeGridDay');
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      const taskEvent = result.current.calendarEvents.find((e) => e.id === 'task-10');
      expect(taskEvent).toBeDefined();
      expect(taskEvent!.end).toBe(incompleteTask.due_date);
    });

    it('タスクの start が due_date の1時間前になる', async () => {
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([incompleteTask]);

      const { result } = renderHook(() => useCalendar());

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setCurrentView('timeGridDay');
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      const taskEvent = result.current.calendarEvents.find((e) => e.id === 'task-10');
      expect(taskEvent).toBeDefined();

      const expectedStart = new Date(
        new Date(incompleteTask.due_date!).getTime() - 60 * 60 * 1000,
      ).toISOString();
      expect(taskEvent!.start).toBe(expectedStart);
    });

    it('未完了タスクは紫系の背景色になる', async () => {
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([incompleteTask]);

      const { result } = renderHook(() => useCalendar());

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setCurrentView('timeGridDay');
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      const taskEvent = result.current.calendarEvents.find((e) => e.id === 'task-10');
      expect(taskEvent).toBeDefined();
      expect(taskEvent!.backgroundColor).toBe('#6d28d9');
    });

    it('完了済みタスクはグレー系の背景色になる', async () => {
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([completedTask]);

      const { result } = renderHook(() => useCalendar());

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setCurrentView('timeGridDay');
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      const taskEvent = result.current.calendarEvents.find((e) => e.id === 'task-11');
      expect(taskEvent).toBeDefined();
      expect(taskEvent!.backgroundColor).toBe('#374151');
    });

    it('タスクイベントの extendedProps に type: task がセットされる', async () => {
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([incompleteTask]);

      const { result } = renderHook(() => useCalendar());

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setCurrentView('timeGridDay');
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      const taskEvent = result.current.calendarEvents.find((e) => e.id === 'task-10');
      expect(taskEvent).toBeDefined();
      expect((taskEvent!.extendedProps as { type: string }).type).toBe('task');
    });

    it('タスクイベントのタイトルに「[タスク]」プレフィックスが付く', async () => {
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([incompleteTask]);

      const { result } = renderHook(() => useCalendar());

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.setCurrentView('timeGridDay');
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      const taskEvent = result.current.calendarEvents.find((e) => e.id === 'task-10');
      expect(taskEvent).toBeDefined();
      expect(taskEvent!.title).toBe('[タスク] 未完了タスク');
    });
  });

  describe('handleCreateEvent', () => {
    it('予定を作成してローカルステートに追加する', async () => {
      (eventApi.fetchEvents as jest.Mock).mockResolvedValue([]);
      (eventApi.createEvent as jest.Mock).mockResolvedValue(mockEvent);

      const { result } = renderHook(() => useCalendar());

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.handleCreateEvent({
          title: 'ミーティング',
          start_at: '2026-05-04T10:00:00.000Z',
          end_at: '2026-05-04T11:00:00.000Z',
        });
      });

      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].id).toBe(1);
    });

    it('予定作成失敗時に例外をスローする', async () => {
      (eventApi.fetchEvents as jest.Mock).mockResolvedValue([]);
      (eventApi.createEvent as jest.Mock).mockRejectedValue(new Error('作成失敗'));

      const { result } = renderHook(() => useCalendar());

      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(
        act(async () => {
          await result.current.handleCreateEvent({
            title: 'ミーティング',
            start_at: '2026-05-04T10:00:00.000Z',
            end_at: '2026-05-04T11:00:00.000Z',
          });
        }),
      ).rejects.toThrow('作成失敗');
    });
  });

  describe('handleUpdateEvent', () => {
    it('予定を更新してローカルステートを置き換える', async () => {
      (eventApi.fetchEvents as jest.Mock).mockResolvedValue([mockEvent]);

      const updated: eventApi.CalendarEvent = { ...mockEvent, title: '更新後のタイトル' };
      (eventApi.updateEvent as jest.Mock).mockResolvedValue(updated);

      const { result } = renderHook(() => useCalendar());

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.handleUpdateEvent(1, { title: '更新後のタイトル' });
      });

      expect(result.current.events[0].title).toBe('更新後のタイトル');
    });

    it('予定更新失敗時に例外をスローする', async () => {
      (eventApi.fetchEvents as jest.Mock).mockResolvedValue([mockEvent]);
      (eventApi.updateEvent as jest.Mock).mockRejectedValue(new Error('更新失敗'));

      const { result } = renderHook(() => useCalendar());

      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(
        act(async () => {
          await result.current.handleUpdateEvent(1, { title: '更新後のタイトル' });
        }),
      ).rejects.toThrow('更新失敗');
    });
  });

  describe('handleDeleteEvent', () => {
    it('予定を削除してローカルステートから除去する', async () => {
      (eventApi.fetchEvents as jest.Mock).mockResolvedValue([mockEvent]);
      (eventApi.deleteEvent as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useCalendar());

      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.handleDeleteEvent(1);
      });

      expect(result.current.events).toHaveLength(0);
    });

    it('予定削除失敗時に例外をスローする', async () => {
      (eventApi.fetchEvents as jest.Mock).mockResolvedValue([mockEvent]);
      (eventApi.deleteEvent as jest.Mock).mockRejectedValue(new Error('削除失敗'));

      const { result } = renderHook(() => useCalendar());

      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(
        act(async () => {
          await result.current.handleDeleteEvent(1);
        }),
      ).rejects.toThrow('削除失敗');
    });
  });

  describe('reload', () => {
    it('reload を呼ぶと fetchEvents が再実行される（dayGridMonthビュー）', async () => {
      (eventApi.fetchEvents as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useCalendar());

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(eventApi.fetchEvents).toHaveBeenCalledTimes(1);
      // dayGridMonth では fetchTasks は呼ばれない
      expect(taskApi.fetchTasks).not.toHaveBeenCalled();

      act(() => {
        result.current.reload();
      });

      await waitFor(() => expect(eventApi.fetchEvents).toHaveBeenCalledTimes(2));
      expect(taskApi.fetchTasks).not.toHaveBeenCalled();
    });

    it('timeGridDayビューで reload を呼ぶと fetchEvents・fetchTasks が再実行される', async () => {
      (eventApi.fetchEvents as jest.Mock).mockResolvedValue([]);
      (taskApi.fetchTasks as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useCalendar());

      await waitFor(() => expect(result.current.loading).toBe(false));

      // timeGridDay に切り替える
      act(() => {
        result.current.setCurrentView('timeGridDay');
      });

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(eventApi.fetchEvents).toHaveBeenCalledTimes(2);
      expect(taskApi.fetchTasks).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.reload();
      });

      await waitFor(() => expect(eventApi.fetchEvents).toHaveBeenCalledTimes(3));
      expect(taskApi.fetchTasks).toHaveBeenCalledTimes(2);
    });
  });

  describe('handleCreateMultipleEvents', () => {
    it('複数予定を一括作成してローカルステートに追加する', async () => {
      (eventApi.fetchEvents as jest.Mock).mockResolvedValue([]);
      const created1 = { ...mockEvent, id: 2 };
      const created2 = { ...mockEvent, id: 3 };
      (eventApi.createMultipleEvents as jest.Mock).mockResolvedValue([created1, created2]);

      const { result } = renderHook(() => useCalendar());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.handleCreateMultipleEvents({
          title: 'ミーティング',
          start_times: [
            '2026-06-01T10:00:00.000Z',
            '2026-06-02T10:00:00.000Z',
          ],
          end_times: [
            '2026-06-01T11:00:00.000Z',
            '2026-06-02T11:00:00.000Z',
          ],
        });
      });

      expect(result.current.events).toHaveLength(2);
      expect(result.current.events.map((e) => e.id)).toEqual([2, 3]);
    });

    it('複数予定作成失敗時に例外をスローする', async () => {
      (eventApi.fetchEvents as jest.Mock).mockResolvedValue([]);
      (eventApi.createMultipleEvents as jest.Mock).mockRejectedValue(new Error('複数作成失敗'));

      const { result } = renderHook(() => useCalendar());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(
        act(async () => {
          await result.current.handleCreateMultipleEvents({
            title: 'ミーティング',
            start_times: ['2026-06-01T10:00:00.000Z'],
            end_times: ['2026-06-01T11:00:00.000Z'],
          });
        }),
      ).rejects.toThrow('複数作成失敗');
    });
  });

  describe('handleCreateRepeatEvent', () => {
    it('繰り返し予定を一括作成してローカルステートに追加する', async () => {
      (eventApi.fetchEvents as jest.Mock).mockResolvedValue([]);
      const created1 = { ...mockEvent, id: 4 };
      const created2 = { ...mockEvent, id: 5 };
      const created3 = { ...mockEvent, id: 6 };
      (eventApi.createRepeatEvent as jest.Mock).mockResolvedValue([created1, created2, created3]);

      const { result } = renderHook(() => useCalendar());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.handleCreateRepeatEvent({
          title: '週次ミーティング',
          start_at: '2026-06-01T10:00:00.000Z',
          end_at: '2026-06-01T11:00:00.000Z',
          repeat: { type: 'weekly', interval: 1, count: 3 },
        });
      });

      expect(result.current.events).toHaveLength(3);
      expect(result.current.events.map((e) => e.id)).toEqual([4, 5, 6]);
    });

    it('繰り返し予定作成失敗時に例外をスローする', async () => {
      (eventApi.fetchEvents as jest.Mock).mockResolvedValue([]);
      (eventApi.createRepeatEvent as jest.Mock).mockRejectedValue(new Error('繰り返し作成失敗'));

      const { result } = renderHook(() => useCalendar());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await expect(
        act(async () => {
          await result.current.handleCreateRepeatEvent({
            title: '週次ミーティング',
            start_at: '2026-06-01T10:00:00.000Z',
            end_at: '2026-06-01T11:00:00.000Z',
            repeat: { type: 'weekly', interval: 1, count: 3 },
          });
        }),
      ).rejects.toThrow('繰り返し作成失敗');
    });
  });
});
