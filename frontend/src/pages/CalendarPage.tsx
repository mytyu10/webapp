import { useState, useRef, useCallback, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DateSelectArg, EventContentArg } from '@fullcalendar/core';
import { useCalendar, CalendarView, CreateEventOptions } from '../hooks/useCalendar';
import { CalendarEvent, EventInput, MultipleEventInput, RepeatEventInput } from '../api/eventApi';
import { fetchEventPermissions, addEventPermission, deleteEventPermission } from '../api/permissionApi';
import { Permission, PermissionInput } from '../api/permissionApi';
import { Priority } from '../api/taskApi';
import EventModal from '../components/EventModal';
import TaskTooltip from '../components/TaskTooltip';
import FormErrorBanner from '../components/FormErrorBanner';
import CalendarViewToggle from '../components/CalendarViewToggle';
import PermissionModal from '../components/PermissionModal';
import ProxyGrantModal from '../components/ProxyGrantModal';
import { useIsMobile } from '../hooks/useIsMobile';

/** ツールチップの状態型 */
interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  description: string;
  priority: Priority;
  category: string | null;
  is_completed: boolean;
  created_by: string;
}

/** タスクイベントの extendedProps 型 */
interface TaskEventProps {
  type: 'task';
  description: string;
  priority: Priority;
  category: string | null;
  is_completed: boolean;
  created_by: string;
}

/**
 * extendedProps がタスクイベントであるかを判定する型ガード関数
 */
function isTaskEvent(props: unknown): props is TaskEventProps {
  return typeof props === 'object' && props !== null && (props as Record<string, unknown>)['type'] === 'task';
}

/**
 * カレンダーページ
 * FullCalendarを使用して予定の表示・作成・編集・削除を提供する。
 * 新規作成時は「通常」「複数日付」「繰り返し」の3モードを選択できる。
 * 繰り返しグループ予定の編集時は「この予定のみ」「繰り返し全て」の選択ができる。
 * 日表示のみタスクを表示し、マウスオーバーでタスク詳細をツールチップ表示する。
 * 作成者のみ「共有」ボタンで権限管理モーダルを開ける。
 * 「代理登録設定」ボタンで代理登録権限管理モーダルを開ける
 */
function CalendarPage() {
  const {
    calendarEvents,
    events,
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
  } = useCalendar();

  const calendarRef = useRef<FullCalendar>(null);
  const isMobile = useIsMobile();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [initialStart, setInitialStart] = useState<string | undefined>(undefined);
  const [modalError, setModalError] = useState('');

  // 権限管理モーダル（予定の共有）
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [permissionEventId, setPermissionEventId] = useState<number | null>(null);
  const [eventPermissions, setEventPermissions] = useState<Permission[]>([]);
  const [permissionError, setPermissionError] = useState('');

  // 代理登録権限管理モーダル
  const [proxyGrantModalOpen, setProxyGrantModalOpen] = useState(false);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    title: '',
    description: '',
    priority: 'MEDIUM',
    category: null,
    is_completed: false,
    created_by: '',
  });

  /**
   * スマホ時に週ビューが選択されていた場合、日ビューへ自動フォールバックする
   */
  useEffect(() => {
    if (isMobile && currentView === 'timeGridWeek') {
      setCurrentView('timeGridDay');
      calendarRef.current?.getApi().changeView('timeGridDay');
    }
  }, [isMobile, currentView, setCurrentView]);

  /**
   * カレンダーの日付・時間帯をクリックして新規作成モーダルを開く
   */
  const handleDateSelect = useCallback((selectInfo: DateSelectArg): void => {
    setSelectedEvent(null);
    setInitialStart(selectInfo.startStr);
    setModalError('');
    setModalOpen(true);
  }, []);

  /**
   * カレンダーのイベントをクリックして編集モーダルを開く
   */
  const handleEventClick = useCallback(
    (clickInfo: EventClickArg): void => {
      const { extendedProps } = clickInfo.event;

      // タスクイベントはクリックしても編集モーダルを開かない
      if (isTaskEvent(extendedProps as Record<string, unknown>)) return;

      const eventId = (extendedProps as { eventId?: number }).eventId;
      if (eventId === undefined) return;

      const found = events.find((e) => e.id === eventId);
      if (!found) return;

      setSelectedEvent(found);
      setInitialStart(undefined);
      setModalError('');
      setModalOpen(true);
    },
    [events],
  );

  /**
   * イベントコンテンツのマウスオーバー時にタスクツールチップを表示する
   */
  const handleEventMouseEnter = useCallback((info: { event: EventContentArg['event']; jsEvent: MouseEvent }): void => {
    const { extendedProps } = info.event;
    if (!isTaskEvent(extendedProps as Record<string, unknown>)) return;

    const props = extendedProps as TaskEventProps;

    setTooltip({
      visible: true,
      x: info.jsEvent.clientX,
      y: info.jsEvent.clientY,
      title: info.event.title.replace('[タスク] ', ''),
      description: props.description,
      priority: props.priority,
      category: props.category,
      is_completed: props.is_completed,
      created_by: props.created_by,
    });
  }, []);

  /**
   * マウスアウト時にツールチップを非表示にする
   */
  const handleEventMouseLeave = useCallback((): void => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  /**
   * マウス移動時にツールチップ位置を更新する
   */
  const handleMouseMove = useCallback((e: React.MouseEvent): void => {
    if (tooltip.visible) {
      setTooltip((prev) => ({ ...prev, x: e.clientX, y: e.clientY }));
    }
  }, [tooltip.visible]);

  /**
   * ビュー切り替え処理。FullCalendarのAPIとローカル状態を同期する
   */
  function handleViewChange(view: CalendarView): void {
    setCurrentView(view);
    calendarRef.current?.getApi().changeView(view);
  }

  /**
   * 通常予定の保存処理（作成・更新を判別して呼び分ける）。
   * 編集かつ繰り返しグループ予定の場合は updateScope に応じて単件更新またはグループ全件更新を行う
   */
  async function handleModalSave(input: EventInput, updateScope: 'single' | 'all'): Promise<void> {
    setModalError('');
    if (selectedEvent) {
      if (updateScope === 'all' && selectedEvent.repeat_group_id) {
        // 繰り返しグループ全件更新: 元の start_at / end_at との差分ミリ秒を算出して送信する
        const origStart = new Date(selectedEvent.start_at).getTime();
        const origEnd = new Date(selectedEvent.end_at).getTime();
        const newStart = new Date(input.start_at).getTime();
        const newEnd = new Date(input.end_at).getTime();
        await handleUpdateRepeatGroupEvent(selectedEvent.repeat_group_id, {
          title: input.title,
          description: input.description,
          start_diff_ms: newStart - origStart,
          end_diff_ms: newEnd - origEnd,
        });
      } else {
        await handleUpdateEvent(selectedEvent.id, input);
      }
    } else {
      await handleCreateEvent(input);
    }
  }

  /**
   * 代理登録・共有登録オプション付き通常予定保存
   */
  async function handleModalSaveWithOptions(
    input: EventInput,
    updateScope: 'single' | 'all',
    options: CreateEventOptions,
  ): Promise<void> {
    setModalError('');
    await handleCreateEvent(input, options);
  }

  /**
   * 複数日付一括作成の保存処理
   */
  async function handleModalSaveMultiple(input: MultipleEventInput): Promise<void> {
    setModalError('');
    await handleCreateMultipleEvents(input);
  }

  /**
   * 代理登録・共有登録オプション付き複数日付一括作成
   */
  async function handleModalSaveMultipleWithOptions(
    input: MultipleEventInput,
    options: CreateEventOptions,
  ): Promise<void> {
    setModalError('');
    await handleCreateMultipleEvents(input, options);
  }

  /**
   * 繰り返し予定作成の保存処理
   */
  async function handleModalSaveRepeat(input: RepeatEventInput): Promise<void> {
    setModalError('');
    await handleCreateRepeatEvent(input);
  }

  /**
   * 代理登録・共有登録オプション付き繰り返し予定作成
   */
  async function handleModalSaveRepeatWithOptions(
    input: RepeatEventInput,
    options: CreateEventOptions,
  ): Promise<void> {
    setModalError('');
    await handleCreateRepeatEvent(input, options);
  }

  /**
   * 予定の権限管理モーダルを開く（作成者のみ）
   */
  async function handleOpenPermissionModal(eventId: number): Promise<void> {
    setPermissionError('');
    try {
      const perms = await fetchEventPermissions(eventId);
      setEventPermissions(perms);
      setPermissionEventId(eventId);
      setPermissionModalOpen(true);
    } catch (err) {
      setPermissionError(err instanceof Error ? err.message : '権限一覧の取得に失敗しました。');
    }
  }

  /**
   * 予定への権限付与
   */
  async function handleAddEventPermission(input: PermissionInput): Promise<void> {
    if (!permissionEventId) return;
    const added = await addEventPermission(permissionEventId, input);
    setEventPermissions((prev) => [...prev, added]);
  }

  /**
   * 予定の権限削除
   */
  async function handleRemoveEventPermission(username: string): Promise<void> {
    if (!permissionEventId) return;
    await deleteEventPermission(permissionEventId, username);
    setEventPermissions((prev) => prev.filter((p) => p.username !== username));
  }

  // 編集中の予定が自分の作成かどうか
  const isSelectedEventOwner = selectedEvent
    ? selectedEvent.created_by === currentUsername
    : false;

  return (
    <div className="flex flex-col h-full p-6" onMouseMove={handleMouseMove}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-100">カレンダー</h1>
          <button
            type="button"
            onClick={() => setProxyGrantModalOpen(true)}
            className="px-3 py-1 text-xs font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-md transition-colors"
          >
            代理登録設定
          </button>
        </div>
        <CalendarViewToggle currentView={currentView} onChange={handleViewChange} isMobile={isMobile} />
      </div>

      {error && <FormErrorBanner message={error} />}
      {modalError && <FormErrorBanner message={modalError} />}
      {permissionError && <FormErrorBanner message={permissionError} />}

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400 text-sm">読み込み中...</p>
        </div>
      ) : (
        <div className="flex-1 calendar-wrapper">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={currentView}
            locale="ja"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: '',
            }}
            selectable
            selectMirror
            events={calendarEvents}
            select={handleDateSelect}
            eventClick={handleEventClick}
            eventMouseEnter={(info) => handleEventMouseEnter({ event: info.event, jsEvent: info.jsEvent })}
            eventMouseLeave={handleEventMouseLeave}
            height="calc(100vh - 160px)"
            buttonText={{
              today: '今日',
              month: '月',
              week: '週',
              day: '日',
            }}
          />
        </div>
      )}

      <EventModal
        open={modalOpen}
        event={selectedEvent}
        initialStart={initialStart}
        currentUsername={currentUsername}
        onSave={handleModalSave}
        onSaveMultiple={handleModalSaveMultiple}
        onSaveRepeat={handleModalSaveRepeat}
        onDelete={handleDeleteEvent}
        onClose={() => setModalOpen(false)}
        onSaveWithOptions={handleModalSaveWithOptions}
        onSaveMultipleWithOptions={handleModalSaveMultipleWithOptions}
        onSaveRepeatWithOptions={handleModalSaveRepeatWithOptions}
      />

      {/* 編集モーダルが開いており作成者の場合に「共有」ボタンを表示する */}
      {modalOpen && selectedEvent && isSelectedEventOwner && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            type="button"
            onClick={() => { void handleOpenPermissionModal(selectedEvent.id); }}
            className="px-4 py-2 text-sm font-semibold text-white bg-violet-700 hover:bg-violet-600 rounded-lg shadow-lg transition-colors"
          >
            共有設定
          </button>
        </div>
      )}

      {/* 予定権限管理モーダル */}
      {permissionModalOpen && (
        <PermissionModal
          title="予定の共有設定"
          permissions={eventPermissions}
          onAdd={handleAddEventPermission}
          onRemove={handleRemoveEventPermission}
          onClose={() => {
            setPermissionModalOpen(false);
            setPermissionEventId(null);
          }}
        />
      )}

      {/* 代理登録権限管理モーダル */}
      {proxyGrantModalOpen && (
        <ProxyGrantModal
          currentUsername={currentUsername}
          onClose={() => setProxyGrantModalOpen(false)}
        />
      )}

      {tooltip.visible && (
        <TaskTooltip
          title={tooltip.title}
          description={tooltip.description}
          priority={tooltip.priority}
          category={tooltip.category}
          is_completed={tooltip.is_completed}
          created_by={tooltip.created_by}
          x={tooltip.x}
          y={tooltip.y}
        />
      )}
    </div>
  );
}

export default CalendarPage;
