import { Navigate } from 'react-router-dom';

/**
 * ホームページ
 * タスク一覧ページへリダイレクトする
 */
function HomePage() {
  return <Navigate to="/tasks" replace />;
}

export default HomePage;
