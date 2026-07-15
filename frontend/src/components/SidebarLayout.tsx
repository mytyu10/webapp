import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

/**
 * サイドバー付きレイアウトコンポーネント
 * ログイン後の全画面に適用される共通レイアウト。
 * トグルボタンでサイドバーの表示・非表示を切り替えられる。
 * h-screen + overflow-hidden でブラウザウィンドウ全体の縦スクロールバーを出さない。
 * 各ページのコンテンツスクロールは main 内の overflow-y-auto が担う。
 */
function SidebarLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col sm:flex-row h-screen overflow-hidden bg-slate-800">
      <Sidebar isOpen={isSidebarOpen} />

      {/* PCのみ: サイドバー開閉トグルボタン */}
      <button
        type="button"
        onClick={() => setIsSidebarOpen((prev) => !prev)}
        className="hidden sm:flex fixed top-1/2 -translate-y-1/2 z-50 items-center justify-center w-5 h-10 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-r-md transition-all duration-200 shadow-md"
        style={{ left: isSidebarOpen ? '240px' : '0px' }}
        aria-label={isSidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'}
      >
        {isSidebarOpen ? '◀' : '▶'}
      </button>

      <main className="flex-1 h-full p-4 sm:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default SidebarLayout;
