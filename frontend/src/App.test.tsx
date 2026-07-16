import React from 'react';
import { render } from '@testing-library/react';

/**
 * App コンポーネントの基本レンダリングテスト。
 * react-router-dom v7 は CRA の Jest 環境（CommonJS）では直接インポートできないため
 * src/__mocks__/react-router-dom.tsx の手動モックを使用する。
 */
import App from './App';

jest.mock('react-router-dom');

jest.mock('./pages/LoginPage', () => () => <div>LoginPage</div>);
jest.mock('./pages/HomePage', () => () => <div>HomePage</div>);
jest.mock('./pages/RegistPage', () => () => <div>RegistPage</div>);
jest.mock('./pages/TaskListPage', () => () => <div>TaskListPage</div>);
jest.mock('./pages/TaskFormPage', () => () => <div>TaskFormPage</div>);
jest.mock('./pages/CalendarPage', () => () => <div>CalendarPage</div>);
jest.mock('./components/PrivateRoute', () => () => null);
jest.mock('./components/SidebarLayout', () => () => null);

test('App コンポーネントがエラーなくレンダリングされる', () => {
  expect(() => render(<App />)).not.toThrow();
});
