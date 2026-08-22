import { useState, useEffect, useCallback, useMemo } from 'react';
import type { EventInput as FullCalendarEventInput } from '@fullcalendar/core';
import {
  CalendarEvent,
  EventInput,
  MultipleEventInput,
  RepeatEventInput,
  UpdateRepeatGroupInput,
  fetchEvents,
  createEvent,
  createMultipleEvents,
  createRepeatEvent,
  updateEvent,
  updateRepeatGroupEvent,
  deleteEvent,
  addEventPermission,
  EventPermissionInput,
} from '../api/eventApi';
import { fetchTasks, Task } from '../api/taskApi';
import { getCurrentUsername } from '../api/taskApi';
import { logger } from '../logger';

const CONTEXT = 'useCalendar';

/** カレンダービューの種別 */
export type CalendarView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

/** 予定作成時のオプション */
export interface CreateEventOptions {
  /** 代理登録時の作成者ユーザー名。未指定時はJWTのユーザー名を使用する */
  proxyUsername?: string;
  /** 共有登録時の共有先ユーザーと権限のリスト。作成後にEventPermissionを付与する */
  sharePermissions?: EventPermissionInput[];
}

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
  /** 予定を作成する（代理登録・共有登録オプション対応） */
  handleCreateEvent: (input: EventInput, options?: CreateEventOptions) => Promise<void>;
  /** 複数日付で予定を一括作成する（代理登録・共有登録オプション対応） */
  handleCreateMultipleEvents: (input: MultipleEventInput, options?: CreateEventOptions) => Promise<void>;
  /** 繰り返しルールで予定を一括作成する（代理登録・共有登録オプション対応） */
  handleCreateRepeatEvent: (input: RepeatEventInput, options?: CreateEventOptions) => Promise<void>;
  /** 予定を更新する */
  handleUpdateEvent: (id: number, input: Partial<EventInput>) => Promise<void>;
  /** 繰り返しグループの全予定を一括更新する */
  handleUpdateRepeatGroupEvent: (groupId: string, input: UpdateRepeatGroupInput) => Promise<void>;
  /** 予定を削除する */
  handleDeleteEvent: (id: number) => Promise<void>;
  /** 一覧を再読み込みする */
  reload: () => void;
}

/** タスクイベントの表示時間（ミリ秒）。FullCalendarで視認できる高さを確保するために1時間分を設定する */
const TASK_EVENT_DURATION_MS = 60 * 60 * 1000;

/**
 * 予定の色識別子から FullCalendar 用の背景色・テキスト色を返す定数マップ。
 * アプリのダークテーマ（slate ベース）に合わせた6色。
 * 識別子が未知の場合はデフォルトのシアンを使用する
 */
const EVENT_COLOR_MAP: Record<string, { bg: string; text: string }> = {
  cyan:    { bg: '#0e7490', text: '#cffafe' },
  indigo:  { bg: '#4338ca', text: '#e0e7ff' },
  emerald: { bg: '#047857', text: '#d1fae5' },
  violet:  { bg: '#6d28d9', text: '#ede9fe' },
  rose:    { bg: '#be123c', text: '#ffe4e6' },
  amber:   { bg: '#b45309', text: '#fef3c7' },
};

const DEFAULT_EVENT_COLOR = EVENT_COLOR_MAP['cyan'];

/**
 * 色識別子から FullCalendar 用の色情報を取得する。
 * 未知の識別子の場合はデフォルトのシアンを返す
 */
function resolveEventColor(color: string): { bg: string; text: string } {
  return EVENT_COLOR_MAP[color] ?? DEFAULT_EVENT_COLOR;
}

/**
 * タスクをFullCalendar用EventInputへ変換する。
 * due_date-1時間をstart、due_dateをendに設定して期限がイベントの終了時刻となるようにする。
 * 日表示（timeGridDay）ビュー専用として呼び出し側でフィルターする
 */
function taskToEventInput(task: Task): FullCalendarEventInput | null {
  if (!task.due_date) return null;
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
 * カレンダー予定をFullCalendar用EventInputへ変換する。
 * event.color をもとに背景色・テキスト色を決定する
 */
function calendarEventToEventInput(event: CalendarEvent): FullCalendarEventInput {
  const { bg, text } = resolveEventColor(event.color);
  return {
    id: `event-${event.id}`,
    title: event.title,
    start: event.start_at,
    end: event.end_at,
    backgroundColor: bg,
    borderColor: bg,
    textColor: text,
    extendedProps: {
      type: 'event' as const,
      eventId: event.id,
      description: event.description,
      created_by: event.created_by,
    },
  };
}

/**
 * 作成後の予定に共有権限を付与する。
 * エラーが発生してもメインフローを止めないよう内部でハンドリングする
 */
async function applySharePermissions(
  eventId: number,
  sharePermissions: EventPermissionInput[],
): Promise<void> {
  for (const perm of sharePermissions) {
    try {
      await addEventPermission(eventId, perm);
      logger.info(CONTEXT, `予定共有権限付与完了: eventId=${eventId}, target=${perm.username}`);
    } catch (err) {
      logger.warn(
        CONTEXT,
        `予定共有権限付与失敗: eventId=${eventId}, target=${perm.username} - ${err instanceof Error ? err.message : '不明なエラー'}`,
      );
    }
  }
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

  /**
   * 予定データを読み込む。
   * 日表示（timeGridDay）の場合のみタスクも取得する
   */
  useEffect(() => {
    let cancelled = false;

    async function loadData(): Promise<void> {
      setLoading(true);
      setError('');
      try {
        if (currentView === 'timeGridDay') {
          logger.info(CONTEXT, '予定・タスク一覧読み込み開始（日表示）');
          const [eventsData, tasksData] = await Promise.all([fetchEvents(), fetchTasks()]);
          if (!cancelled) {
            setEvents(eventsData);
            setTasks(tasksData);
            logger.info(CONTEXT, `予定: ${eventsData.length}件, タスク: ${tasksData.length}件 読み込み完了`);
          }
        } else {
          logger.info(CONTEXT, '予定一覧読み込み開始');
          const eventsData = await fetchEvents();
          if (!cancelled) {
            setEvents(eventsData);
            setTasks([]);
            logger.info(CONTEXT, `予定: ${eventsData.length}件 読み込み完了`);
          }
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
  }, [reloadTrigger, currentView]);

  /**
   * FullCalendarへ渡すイベント配列を構築する。
   * 日表示（timeGridDay）のみタスクを含める。CalendarEvent → EventInputの型変換はここで一元管理する
   */
  const calendarEvents = useMemo((): FullCalendarEventInput[] => {
    const eventInputs = events.map(calendarEventToEventInput);
    if (currentView === 'timeGridDay') {
      const taskInputs = tasks.map(taskToEventInput).filter((e): e is FullCalendarEventInput => e !== null);
      return [...eventInputs, ...taskInputs];
    }
    return eventInputs;
  }, [events, tasks, currentView]);

  /**
   * 予定を作成する。代理登録・共有登録オプション対応。
   * proxyUsername が指定されている場合は created_by として送信する。
   * sharePermissions が指定されている場合は作成後に権限を付与する
   */
  const handleCreateEvent = useCallback(async (
    input: EventInput,
    options?: CreateEventOptions,
  ): Promise<void> => {
    logger.info(CONTEXT, `予定作成実行: ${input.title}`);
    try {
      const payload: EventInput = {
        ...input,
        ...(options?.proxyUsername ? { created_by: options.proxyUsername } : {}),
      };
      const created = await createEvent(payload);
      setEvents((prev) => [...prev, created]);
      logger.info(CONTEXT, `予定作成完了: id=${created.id}`);

      if (options?.sharePermissions && options.sharePermissions.length > 0) {
        await applySharePermissions(created.id, options.sharePermissions);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '予定の作成に失敗しました。';
      logger.warn(CONTEXT, `予定作成失敗: ${message}`);
      throw new Error(message);
    }
  }, []);

  /**
   * 複数の開始日時と終了日時を指定して同じ内容の予定を一括作成する。
   * 代理登録・共有登録オプション対応。作成後はローカルステートに全件追加する
   */
  const handleCreateMultipleEvents = useCallback(async (
    input: MultipleEventInput,
    options?: CreateEventOptions,
  ): Promise<void> => {
    logger.info(CONTEXT, `複数予定作成実行: ${input.title}, 件数=${input.start_times.length}`);
    try {
      const payload: MultipleEventInput = {
        ...input,
        ...(options?.proxyUsername ? { created_by: options.proxyUsername } : {}),
      };
      const created = await createMultipleEvents(payload);
      setEvents((prev) => [...prev, ...created]);
      logger.info(CONTEXT, `複数予定作成完了: ${created.length}件`);

      if (options?.sharePermissions && options.sharePermissions.length > 0) {
        for (const event of created) {
          await applySharePermissions(event.id, options.sharePermissions);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '複数予定の作成に失敗しました。';
      logger.warn(CONTEXT, `複数予定作成失敗: ${message}`);
      throw new Error(message);
    }
  }, []);

  /**
   * 繰り返しルールに基づいて予定を一括作成する。
   * 代理登録・共有登録オプション対応。作成後はローカルステートに全件追加する
   */
  const handleCreateRepeatEvent = useCallback(async (
    input: RepeatEventInput,
    options?: CreateEventOptions,
  ): Promise<void> => {
    logger.info(CONTEXT, `繰り返し予定作成実行: ${input.title}`);
    try {
      const payload: RepeatEventInput = {
        ...input,
        ...(options?.proxyUsername ? { created_by: options.proxyUsername } : {}),
      };
      const created = await createRepeatEvent(payload);
      setEvents((prev) => [...prev, ...created]);
      logger.info(CONTEXT, `繰り返し予定作成完了: ${created.length}件`);

      if (options?.sharePermissions && options.sharePermissions.length > 0) {
        for (const event of created) {
          await applySharePermissions(event.id, options.sharePermissions);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '繰り返し予定の作成に失敗しました。';
      logger.warn(CONTEXT, `繰り返し予定作成失敗: ${message}`);
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
   * 繰り返しグループの全予定を一括更新する。
   * 更新後はローカルステートの該当グループの全予定をサーバーレスポンスで置き換える
   */
  const handleUpdateRepeatGroupEvent = useCallback(
    async (groupId: string, input: UpdateRepeatGroupInput): Promise<void> => {
      logger.info(CONTEXT, `繰り返しグループ更新実行: groupId=${groupId}`);
      try {
        const updated = await updateRepeatGroupEvent(groupId, input);
        const updatedIds = new Set(updated.map((e) => e.id));
        setEvents((prev) => [
          ...prev.filter((e) => !updatedIds.has(e.id)),
          ...updated,
        ]);
        logger.info(CONTEXT, `繰り返しグループ更新完了: groupId=${groupId}, 件数=${updated.length}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : '繰り返し予定の更新に失敗しました。';
        logger.warn(CONTEXT, `繰り返しグループ更新失敗: groupId=${groupId} - ${message}`);
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
    handleCreateMultipleEvents,
    handleCreateRepeatEvent,
    handleUpdateEvent,
    handleUpdateRepeatGroupEvent,
    handleDeleteEvent,
    reload,
  };
}
