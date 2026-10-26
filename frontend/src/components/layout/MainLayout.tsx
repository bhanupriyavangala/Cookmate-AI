import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { NavItemKey } from '../../types';

interface MainLayoutProps {
  currentTab: NavItemKey;
  onTabChange: (tab: NavItemKey) => void;
  backendOnline: boolean;
  isChecking: boolean;
  onRefreshHealth: () => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentTab,
  onTabChange,
  backendOnline,
  isChecking,
  onRefreshHealth,
  children,
}) => {
  return (
    <div className="app-layout">
      <Sidebar
        currentTab={currentTab}
        onTabChange={onTabChange}
        backendOnline={backendOnline}
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
