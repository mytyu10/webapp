import { useState, useEffect, useCallback, useMemo } from 'react';
import type { EventInput as FullCalendarEventInput } from '@fullcalendar/core';
import {
  CalendarEvent,
  EventInput,
  fetchEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../api/eventApi';
import { fetchTasks, Task } from '../api/taskApi';
import { getCurrentUsername } from '../api/taskApi';
import { logger } from '../logger';

const CONTEXT = 'useCalendar';

/** カレンダービューの種別 */
export type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

/** useCalendarフックの戻り値型 */
export interface UseCalendarReturn {
  /** 予定一覧 */
  events: CalendarEvent[];
  /** FullCalendarへ渡すEventInput配列（タスク込み） */
  calendarEvents: FullCalendarEventInput[];
  /** 現在のビュー */
  currentView: CalendarView;
  /** ローディング中フラグ */
  loading: boolean;
  /** エラーメッセージ */
  error: string;
  /** ログイン中ユーザー名 */
  currentUsername: string | null;
  /** ビューを切り替える */
  setCurrentView: (view: CalendarView) => void;
  /** 予定を作成する */
  handleCreateEvent: (input: EventInput) => Promise<void>;
  /** 予定を更新する */
  handleUpdateEvent: (id: number, input: Partial<EventInput>) => Promise<void>;
  /** 予定を削除する */
  handleDeleteEvent: (id: number) => Promise<void>;
  /** 一覧を再読み込みする */
  reload: () => void;
}

/** タスクイベントの表示時間（ミリ秒）。FullCalendarで視認できる高さを確保するために1時間分を設定する */
const TASK_EVENT_DURATION_MS = 60 * 60 * 1000;

/**
 * タスクをFullCalendar用EventInputへ変換する。
 * due_date-1時間をstart、due_dateをendに設定して期限がイベントの終了時刻となるようにする。
 * 日表示（timeGridDay）ビュー専用として呼び出し側でフィルターする
 */
function taskToEventInput(task: Task): FullCalendarEventInput {
  const end = task.due_date;
  const start = new Date(new Date(task.due_date).getTime() - TASK_EVENT_DURATION_MS).toISOString();
  const bgColor = task.is_completed ? '#374151' : '#6d28d9';
  const textColor = task.is_completed ? '#9ca3af' : '#ede9fe';
  return {
    id: `task-${task.id}`,
    title: `[タスク] ${task.title}`,
    start,
    end,
    allDay: false,
    backgroundColor: bgColor,
    borderColor: bgColor,
    textColor,
    extendedProps: {
      type: 'task' as const,
      taskId: task.id,
      description: task.description,
      priority: task.priority,
      category: task.category,
      is_completed: task.is_completed,
      created_by: task.created_by,
    },
  };
}

/**
 * カレンダー予定をFullCalendar用EventInputへ変換する
 */
function calendarEventToEventInput(event: CalendarEvent): FullCalendarEventInput {
  return {
    id: `event-${event.id}`,
    title: event.title,
    start: event.start_at,
    end: event.end_at,
    backgroundColor: '#0e7490',
    borderColor: '#0e7490',
    textColor: '#cffafe',
    extendedProps: {
      type: 'event' as const,
      eventId: event.id,
      description: event.description,
      created_by: event.created_by,
    },
  };
}

/**
 * カレンダー予定・タスク表示・ビュー切り替えを管理するカスタムフック
 */
export function useCalendar(): UseCalendarReturn {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentView, setCurrentView] = useState<CalendarView>('dayGridMonth');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const currentUsername = getCurrentUsername();

  /**
   * 予定とタスクを再読み込みするトリガーをインクリメントする
   */
  const reload = useCallback((): void => {
    setReloadTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadData(): Promise<void> {
      setLoading(true);
      setError('');
      try {
        logger.info(CONTEXT, '予定・タスク一覧読み込み開始');
        const [eventsData, tasksData] = await Promise.all([fetchEvents(), fetchTasks()]);
        if (!cancelled) {
          setEvents(eventsData);
          setTasks(tasksData);
          logger.info(CONTEXT, `予定: ${eventsData.length}件, タスク: ${tasksData.length}件 読み込み完了`);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'データの取得に失敗しました。';
          logger.warn(CONTEXT, `データ読み込み失敗: ${message}`);
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [reloadTrigger]);

  /**
   * FullCalendarへ渡すイベント配列を構築する。
   * 日表示（timeGridDay）のみタスクを含める。CalendarEvent → EventInputの型変換はここで一元管理する
   */
  const calendarEvents = useMemo((): FullCalendarEventInput[] => {
    const eventInputs = events.map(calendarEventToEventInput);
    if (currentView === 'timeGridDay') {
      const taskInputs = tasks.map(taskToEventInput);
      return [...eventInputs, ...taskInputs];
    }
    return eventInputs;
  }, [events, tasks, currentView]);

  /**
   * 予定を作成する。作成後はローカルステートに追加する
   */
  const handleCreateEvent = useCallback(async (input: EventInput): Promise<void> => {
    logger.info(CONTEXT, `予定作成実行: ${input.title}`);
    try {
      const created = await createEvent(input);
      setEvents((prev) => [...prev, created]);
      logger.info(CONTEXT, `予定作成完了: id=${created.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '予定の作成に失敗しました。';
      logger.warn(CONTEXT, `予定作成失敗: ${message}`);
      throw new Error(message);
    }
  }, []);

  /**
   * 予定を更新する。更新後はローカルステートの該当予定をサーバーレスポンスで置き換える
   */
  const handleUpdateEvent = useCallback(
    async (id: number, input: Partial<EventInput>): Promise<void> => {
      logger.info(CONTEXT, `予定更新実行: id=${id}`);
      try {
        const updated = await updateEvent(id, input);
        setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
        logger.info(CONTEXT, `予定更新完了: id=${id}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : '予定の更新に失敗しました。';
        logger.warn(CONTEXT, `予定更新失敗: id=${id} - ${message}`);
        throw new Error(message);
      }
    },
    [],
  );

  /**
   * 予定を削除する。削除後はローカルステートから除去する
   */
  const handleDeleteEvent = useCallback(async (id: number): Promise<void> => {
    logger.info(CONTEXT, `予定削除実行: id=${id}`);
    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      logger.info(CONTEXT, `予定削除完了: id=${id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '予定の削除に失敗しました。';
      logger.warn(CONTEXT, `予定削除失敗: id=${id} - ${message}`);
      throw new Error(message);
    }
  }, []);

  return {
    events,
    calendarEvents,
    currentView,
    loading,
    error,
    currentUsername,
    setCurrentView,
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    reload,
  };
}
