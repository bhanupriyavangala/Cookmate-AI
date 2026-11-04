import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { NavItemKey, EmployeeUser } from '../../types';

interface MainLayoutProps {
  currentTab: NavItemKey;
  onTabChange: (tab: NavItemKey) => void;
  backendOnline: boolean;
  isChecking: boolean;
  onRefreshHealth: () => void;
  currentUser?: EmployeeUser | null;
  onLogout?: () => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentTab,
  onTabChange,
  backendOnline,
  isChecking,
  onRefreshHealth,
  currentUser,
  onLogout,
  children,
}) => {
  return (
    <div className="app-layout">
      <Sidebar
        currentTab={currentTab}
        onTabChange={onTabChange}
        backendOnline={backendOnline}
        currentUser={currentUser}
        onLogout={onLogout}
      />
      <div className="main-wrapper">
        <Header
          currentTab={currentTab}
          backendOnline={backendOnline}
          isChecking={isChecking}
          onRefreshHealth={onRefreshHealth}
        />
        <main className="content-area">{children}</main>
      </div>
    </div>
  );
};
