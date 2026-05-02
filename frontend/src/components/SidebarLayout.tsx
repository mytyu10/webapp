import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

/**
 * サイドバー付きレイアウトコンポーネント
 * ログイン後の全画面に適用される共通レイアウト
 */
function SidebarLayout() {
  return (
    <div className="flex min-h-screen bg-slate-800">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default SidebarLayout;
