/**
 * react-router-dom v7 は ESM のみ提供しており CRA の Jest 環境では解決できないため、
 * テスト用の手動モックを定義する。
 */
import React from 'react';

export const BrowserRouter = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

export const Routes = ({ children }: { children: React.ReactNode }) => (
  <div>{children}</div>
);

export const Route = () => null;

export const Outlet = () => null;

export const useNavigate = () => jest.fn();

export const useParams = () => ({});

export const Navigate = () => null;

export const Link = ({
  children,
  to,
}: {
  children: React.ReactNode;
  to: string;
}) => <a href={to}>{children}</a>;

export const NavLink = ({
  children,
  to,
}: {
  children: React.ReactNode;
  to: string;
}) => <a href={to}>{children}</a>;
