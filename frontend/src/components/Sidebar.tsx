import { NavLink, useNavigate } from 'react-router-dom';
import { logger } from '../logger';

const CONTEXT = 'Sidebar';

/** ナビゲーションリンクの定義 */
const NAV_LINKS = [
  { to: '/tasks', label: 'タスク管理' },
  { to: '/calendar', label: 'カレンダー' },
  { to: '/links', label: 'リンク集' },
  { to: '/chat', label: 'チャット' },
  { to: '/webauthn/register', label: '顔認証設定' },
] as const;

interface SidebarProps {
  /** サイドバーを表示するかどうか（PCのみ適用） */
  isOpen: boolean;
  /** サイドバー開閉を切り替えるコールバック（PCのみ表示するトグルボタンで使用） */
  onToggle: () => void;
}

/**
 * サイドバーコンポーネント
 * ログイン後の全画面に共通して表示されるナビゲーションサイドバー。
 * isOpen=false のとき PC では幅を最小（w-8）に縮小し、トグルボタンのみ表示する。
 * モバイルは常に全幅表示。
 */
function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const navigate = useNavigate();

  /**
   * ログアウト処理
   * localStorageのトークンを削除してログイン画面へ遷移する
   */
  function handleLogout(): void {
    logger.info(CONTEXT, 'ログアウト処理実行');
    localStorage.removeItem('token');
    navigate('/login');
  }

  return (
    <aside
      className={`
        w-full bg-slate-900 border-b sm:border-b-0 sm:border-r border-slate-700
        flex flex-row sm:flex-col
        transition-all duration-200 overflow-hidden
        ${isOpen ? 'sm:w-60' : 'sm:w-8 sm:border-r'}
      `}
    >
      {/* PCのみ: トグルボタン（サイドバー上部に常時表示） */}
      <button
        type="button"
        onClick={onToggle}
        className="hidden sm:flex items-center justify-center w-8 h-8 shrink-0 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        aria-label={isOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'}
      >
        {isOpen ? '◀' : '▶'}
      </button>

      {/* コンテンツ: サイドバーが閉じているときはPCで非表示 */}
      <div className={`flex flex-row sm:flex-col flex-1 min-w-0 ${isOpen ? '' : 'sm:hidden'}`}>
        <div className="px-4 sm:px-6 py-3 sm:py-5 border-r sm:border-r-0 sm:border-b border-slate-700 flex items-center shrink-0 min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-100 whitespace-nowrap">WebApp</h2>
        </div>

        <nav className="flex flex-row sm:flex-col flex-1 px-2 sm:px-3 py-2 sm:py-4 gap-1 sm:gap-0 sm:space-y-1 min-w-0">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-sky-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-2 sm:px-3 py-2 sm:py-4 sm:border-t border-slate-700 flex flex-col gap-2 items-start shrink-0 min-w-0">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap"
          >
            ログアウト
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
