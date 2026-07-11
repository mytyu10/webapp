import React from 'react';
import { render, screen } from '@testing-library/react';
import CalendarPage from './CalendarPage';
import * as useCalendarModule from '../hooks/useCalendar';
import * as useIsMobileModule from '../hooks/useIsMobile';

// -----------------------------------------------------------------------
// モック設定
// -----------------------------------------------------------------------

jest.mock('react-router-dom');

// FullCalendar は DOM 依存が強いためモックで差し替える
jest.mock('@fullcalendar/react', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef((_props: unknown, ref: React.Ref<unknown>) => {
      // calendarRef.current?.getApi() を呼ぶので最低限の API を実装する
      React.useImperativeHandle(ref, () => ({
        getApi: () => ({
          changeView: jest.fn(),
        }),
      }));
      return <div data-testid="fullcalendar-mock" />;
    }),
  };
});

jest.mock('@fullcalendar/daygrid', () => ({}));
jest.mock('@fullcalendar/timegrid', () => ({}));
jest.mock('@fullcalendar/interaction', () => ({}));

jest.mock('../api/eventApi', () => ({
  fetchEvents: jest.fn().mockResolvedValue([]),
  createEvent: jest.fn(),
  createMultipleEvents: jest.fn(),
  createRepeatEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
}));

jest.mock('../api/taskApi', () => ({
  fetchTasks: jest.fn().mockResolvedValue([]),
  getCurrentUsername: jest.fn().mockReturnValue('testuser'),
}));

jest.mock('../logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// EventModal / TaskTooltip / FormErrorBanner は表示内容のテストではないのでスタブ化
jest.mock('../components/EventModal', () => () => null);
jest.mock('../components/TaskTooltip', () => () => null);
jest.mock('../components/FormErrorBanner', () => () => null);

// -----------------------------------------------------------------------
// ヘルパー: useCalendar の戻り値を部分的にオーバーライドする
// -----------------------------------------------------------------------

function buildUseCalendarReturn(
  overrides: Partial<useCalendarModule.UseCalendarReturn> = {},
): useCalendarModule.UseCalendarReturn {
  return {
    events: [],
    calendarEvents: [],
    currentView: 'dayGridMonth',
    loading: false,
    error: '',
    currentUsername: 'testuser',
    setCurrentView: jest.fn(),
    handleCreateEvent: jest.fn(),
    handleCreateMultipleEvents: jest.fn(),
    handleCreateRepeatEvent: jest.fn(),
    handleUpdateEvent: jest.fn(),
    handleUpdateRepeatGroupEvent: jest.fn(),
    handleDeleteEvent: jest.fn(),
    reload: jest.fn(),
    ...overrides,
  };
}

// -----------------------------------------------------------------------
// テスト
// -----------------------------------------------------------------------

describe('CalendarPage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('CalendarViewToggle へ isMobile が伝わる', () => {
    it('スマホ時（isMobile=true）は「週」ボタンが非表示になる', () => {
      jest.spyOn(useIsMobileModule, 'useIsMobile').mockReturnValue(true);
      jest.spyOn(useCalendarModule, 'useCalendar').mockReturnValue(buildUseCalendarReturn());

      render(<CalendarPage />);

      expect(screen.queryByText('週')).not.toBeInTheDocument();
      expect(screen.getByText('月')).toBeInTheDocument();
      expect(screen.getByText('日')).toBeInTheDocument();
    });

    it('PC 時（isMobile=false）は「週」ボタンが表示される', () => {
      jest.spyOn(useIsMobileModule, 'useIsMobile').mockReturnValue(false);
      jest.spyOn(useCalendarModule, 'useCalendar').mockReturnValue(buildUseCalendarReturn());

      render(<CalendarPage />);

      expect(screen.getByText('週')).toBeInTheDocument();
    });
  });

  describe('週→日ビュー自動フォールバック（useEffect）', () => {
    it('スマホで currentView=timeGridWeek のとき setCurrentView(timeGridDay) が呼ばれる', () => {
      const setCurrentView = jest.fn();

      jest.spyOn(useIsMobileModule, 'useIsMobile').mockReturnValue(true);
      jest.spyOn(useCalendarModule, 'useCalendar').mockReturnValue(
        buildUseCalendarReturn({ currentView: 'timeGridWeek', setCurrentView }),
      );

      render(<CalendarPage />);

      // useEffect が同期的に実行された後に確認
      expect(setCurrentView).toHaveBeenCalledWith('timeGridDay');
    });

    it('スマホで currentView=dayGridMonth のとき setCurrentView は呼ばれない', () => {
      const setCurrentView = jest.fn();

      jest.spyOn(useIsMobileModule, 'useIsMobile').mockReturnValue(true);
      jest.spyOn(useCalendarModule, 'useCalendar').mockReturnValue(
        buildUseCalendarReturn({ currentView: 'dayGridMonth', setCurrentView }),
      );

      render(<CalendarPage />);

      expect(setCurrentView).not.toHaveBeenCalled();
    });

    it('PC で currentView=timeGridWeek のとき setCurrentView は呼ばれない', () => {
      const setCurrentView = jest.fn();

      jest.spyOn(useIsMobileModule, 'useIsMobile').mockReturnValue(false);
      jest.spyOn(useCalendarModule, 'useCalendar').mockReturnValue(
        buildUseCalendarReturn({ currentView: 'timeGridWeek', setCurrentView }),
      );

      render(<CalendarPage />);

      expect(setCurrentView).not.toHaveBeenCalled();
    });

    it('isMobile が true→false に変化したとき setCurrentView は呼ばれない', () => {
      const setCurrentView = jest.fn();
      const useIsMobileSpy = jest.spyOn(useIsMobileModule, 'useIsMobile').mockReturnValue(true);
      jest.spyOn(useCalendarModule, 'useCalendar').mockReturnValue(
        buildUseCalendarReturn({ currentView: 'timeGridDay', setCurrentView }),
      );

      const { rerender } = render(<CalendarPage />);
      setCurrentView.mockClear();

      // PC 幅に変化
      useIsMobileSpy.mockReturnValue(false);
      rerender(<CalendarPage />);

      // timeGridDay のまま PC になった場合はフォールバック不要
      expect(setCurrentView).not.toHaveBeenCalled();
    });
  });

  describe('ローディング表示', () => {
    it('loading=true のとき「読み込み中...」が表示される', () => {
      jest.spyOn(useIsMobileModule, 'useIsMobile').mockReturnValue(false);
      jest.spyOn(useCalendarModule, 'useCalendar').mockReturnValue(
        buildUseCalendarReturn({ loading: true }),
      );

      render(<CalendarPage />);

      expect(screen.getByText('読み込み中...')).toBeInTheDocument();
    });

    it('loading=false のとき FullCalendar が表示される', () => {
      jest.spyOn(useIsMobileModule, 'useIsMobile').mockReturnValue(false);
      jest.spyOn(useCalendarModule, 'useCalendar').mockReturnValue(
        buildUseCalendarReturn({ loading: false }),
      );

      render(<CalendarPage />);

      expect(screen.getByTestId('fullcalendar-mock')).toBeInTheDocument();
    });
  });
});
