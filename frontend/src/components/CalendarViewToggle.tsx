import { CalendarView } from '../hooks/useCalendar';

/** ビュー切り替えボタンの定義 */
const VIEW_BUTTONS: { view: CalendarView; label: string; mobileHidden?: boolean }[] = [
  { view: 'dayGridMonth', label: '月' },
  { view: 'timeGridWeek', label: '週', mobileHidden: true },
  { view: 'timeGridDay', label: '日' },
];

/** CalendarViewToggle の props 型 */
interface CalendarViewToggleProps {
  /** 現在のビュー */
  currentView: CalendarView;
  /** ビュー切り替えコールバック */
  onChange: (view: CalendarView) => void;
  /** スマホ表示かどうか。true の場合、週ボタンを非表示にする */
  isMobile?: boolean;
}

/**
 * カレンダーのビュー切り替えボタングループコンポーネント
 * 月・週・日の3種類のビューを切り替える。
 * スマホ時（isMobile=true）は週ボタンを非表示にする
 */
function CalendarViewToggle({ currentView, onChange, isMobile = false }: CalendarViewToggleProps) {
  return (
    <div className="flex gap-1">
      {VIEW_BUTTONS.filter(({ mobileHidden }) => !(isMobile && mobileHidden)).map(({ view, label }) => (
        <button
          key={view}
          type="button"
          onClick={() => onChange(view)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            currentView === view
              ? 'bg-sky-700 text-white'
              : 'text-slate-300 bg-slate-700 hover:bg-slate-600'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default CalendarViewToggle;
