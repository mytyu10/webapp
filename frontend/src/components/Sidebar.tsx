import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { logger } from '../logger';
import { fetchMe } from '../api/taskApi';

const CONTEXT = 'Sidebar';

/** バックエンドの LINE ログイン開始エンドポイント URL */
const LINE_LOGIN_URL = (() => {
  const { REACT_APP_API_SCHEME, REACT_APP_API_HOST, REACT_APP_API_PORT } = process.env;
  return REACT_APP_API_HOST
    ? `${REACT_APP_API_SCHEME}://${REACT_APP_API_HOST}:${REACT_APP_API_PORT}/accounts/line/login`
    : '/accounts/line/login';
})();

/** ナビゲーションリンクの定義 */
const NAV_LINKS = [
  { to: '/tasks', label: 'タスク管理' },
  { to: '/calendar', label: 'カレンダー' },
  { to: '/links', label: 'リンク集' },
] as const;

interface SidebarProps {
  /** サイドバーを表示するかどうか（PCのみ適用） */
  isOpen: boolean;
}

/**
 * サイドバーコンポーネント
 * ログイン後の全画面に共通して表示されるナビゲーションサイドバー。
 * LINE連携状態を取得して表示する。
 * isOpen=false のとき PC では非表示になる（モバイルは常に表示）
 */
function Sidebar({ isOpen }: SidebarProps) {
  const navigate = useNavigate();
  const [isLineLinked, setIsLineLinked] = useState<boolean | null>(null);

  /**
   * LINE連携状態を取得する
   */
  useEffect(() => {
    async function loadLineStatus(): Promise<void> {
      try {
        const me = await fetchMe();
        setIsLineLinked(me.line_user_id !== null);
      } catch (err) {
        logger.warn(CONTEXT, `LINE連携状態取得失敗: ${err instanceof Error ? err.message : '不明なエラー'}`);
        setIsLineLinked(false);
      }
    }
    void loadLineStatus();
  }, []);

  /**
   * ログアウト処理
   * localStorageのトークンを削除してログイン画面へ遷移する
   */
  function handleLogout(): void {
    logger.info(CONTEXT, 'ログアウト処理実行');
    localStorage.removeItem('token');
    navigate('/login');
  }

  /**
   * LINE連携ボタンをクリックしたときにバックエンドの LINE ログイン開始エンドポイントへ遷移する
   */
  function handleLineLogin(): void {
    logger.info(CONTEXT, 'LINE連携開始');
    window.location.href = LINE_LOGIN_URL;
  }

  return (
    <aside
      className={`
        w-full sm:w-60 sm:min-h-screen bg-slate-900 border-b sm:border-b-0 sm:border-r border-slate-700
        flex flex-row sm:flex-col
        transition-all duration-200 overflow-hidden
        ${isOpen ? 'sm:w-60' : 'sm:w-0 sm:border-r-0'}
      `}
    >
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
        {/* LINE連携状態表示 */}
        {isLineLinked === true ? (
          <span className="flex items-center px-3 py-2 text-sm font-medium text-slate-500 select-none whitespace-nowrap">
            LINE連携済み
          </span>
        ) : (
          <button
            type="button"
            onClick={handleLineLogin}
            className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-green-400 hover:bg-slate-800 hover:text-green-300 transition-colors whitespace-nowrap"
          >
            LINEと連携する
          </button>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap"
        >
          ログアウト
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
