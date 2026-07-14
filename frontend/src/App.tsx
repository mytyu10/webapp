import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import RegistPage from './pages/RegistPage';
import TaskListPage from './pages/TaskListPage';
import TaskFormPage from './pages/TaskFormPage';
import CalendarPage from './pages/CalendarPage';
import LineCallbackPage from './pages/LineCallbackPage';
import LinkListPage from './pages/LinkListPage';
import ChatPage from './pages/ChatPage';
import PrivateRoute from './components/PrivateRoute';
import SidebarLayout from './components/SidebarLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 公開ルート */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/regist" element={<RegistPage />} />
        {/* LINE連携コールバック（認証不要：LINE OAuthから直接リダイレクトされるため） */}
        <Route path="/line-callback" element={<LineCallbackPage />} />

        {/* 認証済みルート（PrivateRoute + SidebarLayout） */}
        <Route element={<PrivateRoute />}>
          <Route element={<SidebarLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/tasks" element={<TaskListPage />} />
            <Route path="/tasks/new" element={<TaskFormPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/links" element={<LinkListPage />} />
            <Route path="/chat" element={<ChatPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
