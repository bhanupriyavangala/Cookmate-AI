import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { DashboardView } from './views/DashboardView';
import { ClientsView } from './views/ClientsView';
import { ContactsView } from './views/ContactsView';
import { ProjectsView } from './views/ProjectsView';
import { MessagesView } from './views/MessagesView';
import { SettingsView } from './views/SettingsView';
import { ClientPortalView } from './views/ClientPortalView';
import type { NavItemKey, HealthCheckResponse } from './types';
import { api } from './services/api';

function getPortalTokenFromUrl(): string | null {
  // 1. Check pathname: /portal/:token
  const match = window.location.pathname.match(/\/portal\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // 2. Check query param: ?portal=:token or ?token=:token
  const params = new URLSearchParams(window.location.search);
  const paramToken = params.get('portal') || params.get('token');
  if (paramToken) {
    return paramToken;
  }
  // 3. Check hash fragment: #portal=:token
  if (window.location.hash.startsWith('#portal=')) {
    return window.location.hash.replace('#portal=', '');
  }
  return null;
}

export function App() {
  const [currentTab, setCurrentTab] = useState<NavItemKey>('dashboard');
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Check if current visitor opened a public client portal link
  const portalToken = getPortalTokenFromUrl();

  const checkBackendHealth = useCallback(async () => {
    setIsChecking(true);
    const startTime = performance.now();

    try {
      const data = await api.getHealth();
      const elapsed = Math.round(performance.now() - startTime);
      setLatencyMs(elapsed);
      setHealthData(data);
      setBackendOnline(true);
    } catch {
      // Backend not running yet or unreachable
      setBackendOnline(false);
      setLatencyMs(null);
      setHealthData(null);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    // Only check employee backend health if not in standalone client portal mode
    if (!portalToken) {
      checkBackendHealth();
    }
  }, [portalToken, checkBackendHealth]);

  // If visitor is opening a client portal token link, render the dedicated mobile-friendly client portal
  if (portalToken) {
    return <ClientPortalView token={portalToken} />;
  }

  // Otherwise, render full employee application layout
  return (
    <MainLayout
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      backendOnline={backendOnline}
      isChecking={isChecking}
      onRefreshHealth={checkBackendHealth}
    >
      {currentTab === 'dashboard' && (
        <DashboardView
          healthData={healthData}
          backendOnline={backendOnline}
          isChecking={isChecking}
          latencyMs={latencyMs}
          onRefreshHealth={checkBackendHealth}
          onNavigate={setCurrentTab}
        />
      )}
      {currentTab === 'clients' && <ClientsView />}
      {currentTab === 'contacts' && <ContactsView />}
      {currentTab === 'projects' && <ProjectsView />}
      {currentTab === 'messages' && <MessagesView />}
      {currentTab === 'settings' && <SettingsView />}
    </MainLayout>
  );
}

export default App;
