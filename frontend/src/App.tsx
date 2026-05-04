import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import RegistPage from './pages/RegistPage';
import TaskListPage from './pages/TaskListPage';
import TaskFormPage from './pages/TaskFormPage';
import CalendarPage from './pages/CalendarPage';
import PrivateRoute from './components/PrivateRoute';
import SidebarLayout from './components/SidebarLayout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 公開ルート */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/regist" element={<RegistPage />} />

        {/* 認証済みルート（PrivateRoute + SidebarLayout） */}
        <Route element={<PrivateRoute />}>
          <Route element={<SidebarLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/tasks" element={<TaskListPage />} />
            <Route path="/tasks/new" element={<TaskFormPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
