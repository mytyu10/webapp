import { CalendarView } from '../hooks/useCalendar';

/** ビュー切り替えボタンの定義 */
const VIEW_BUTTONS: { view: CalendarView; label: string }[] = [
  { view: 'dayGridMonth', label: '月' },
  { view: 'timeGridWeek', label: '週' },
  { view: 'timeGridDay', label: '日' },
];

/** CalendarViewToggle の props 型 */
interface CalendarViewToggleProps {
  /** 現在のビュー */
  currentView: CalendarView;
  /** ビュー切り替えコールバック */
  onChange: (view: CalendarView) => void;
}

/**
 * カレンダーのビュー切り替えボタングループコンポーネント
 * 月・週・日の3種類のビューを切り替える
 */
function CalendarViewToggle({ currentView, onChange }: CalendarViewToggleProps) {
  return (
    <div className="flex gap-1">
      {VIEW_BUTTONS.map(({ view, label }) => (
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
