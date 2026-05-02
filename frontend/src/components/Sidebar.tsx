import { NavLink, useNavigate } from 'react-router-dom';
import { logger } from '../logger';

const CONTEXT = 'Sidebar';

/** ナビゲーションリンクの定義 */
const NAV_LINKS = [
  { to: '/tasks', label: 'タスク管理' },
] as const;

/**
 * サイドバーコンポーネント
 * ログイン後の全画面に共通して表示されるナビゲーションサイドバー
 */
function Sidebar() {
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
    <aside className="w-60 min-h-screen bg-slate-900 border-r border-slate-700 flex flex-col">
      <div className="px-6 py-5 border-b border-slate-700">
        <h2 className="text-lg font-bold text-slate-100">WebApp</h2>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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

      <div className="px-3 py-4 border-t border-slate-700">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          ログアウト
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
