import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

/**
 * サイドバー付きレイアウトコンポーネント
 * ログイン後の全画面に適用される共通レイアウト。
 * トグルボタン（サイドバー内上部に配置）でサイドバーの表示・非表示を切り替えられる。
 * h-screen + overflow-hidden でブラウザウィンドウ全体の縦スクロールバーを出さない。
 * 各ページのコンテンツスクロールは main 内の overflow-y-auto が担う。
 */
function SidebarLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col sm:flex-row h-screen overflow-hidden bg-slate-800">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen((prev) => !prev)}
      />

      <main className="flex-1 h-full p-4 sm:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default SidebarLayout;
