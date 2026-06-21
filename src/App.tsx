import { useEffect, useState } from 'react';
import Sidebar, { type ActivePage } from './components/Sidebar';
import Header from './components/Header';
import LaboratoryList from './pages/LaboratoryList';
import EquipmentAvailability from './pages/EquipmentAvailability';
import ApplicationStatus from './pages/ApplicationStatus';
import StaffOnDuty from './pages/StaffOnDuty';
import AdvancedElectronics from './pages/AdvancedElectronics';
import LoginPage from './pages/LoginPage';
import InventoryManagement from './pages/InventoryManagement';
import {
  getCurrentAuthenticatedUser,
  signOutUser,
  type AllowedUser,
} from './auth';
import { AppProvider, useAppState } from './context';

type ViewMode =
  | { page: ActivePage; labId: null }
  | { page: 'laboratories'; labId: string };

function hasSupabaseRecoveryToken(): boolean {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

  return (
    window.location.pathname === '/reset-password' ||
    searchParams.get('type') === 'recovery' ||
    hashParams.get('type') === 'recovery' ||
    searchParams.has('code') ||
    hashParams.has('access_token')
  );
}

function MainDashboardApp() {
  const { loading } = useAppState();
  const [currentUser, setCurrentUser] = useState<AllowedUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isResetPasswordMode, setIsResetPasswordMode] = useState(hasSupabaseRecoveryToken);
  const [view, setView] = useState<ViewMode>({ page: 'laboratories', labId: null });

  useEffect(() => {
    let isMounted = true;

    async function restoreUserSession() {
      const user = await getCurrentAuthenticatedUser();

      if (isMounted) {
        setCurrentUser(user);
        setAuthLoading(false);
      }
    }

    restoreUserSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleUrlChange = () => {
      if (hasSupabaseRecoveryToken()) {
        setIsResetPasswordMode(true);
      }
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);

    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const navigateToPage = (page: ActivePage) => {
    setView({ page, labId: null });
  };

  const handleLabClick = (labId: string) => {
    setView({ page: 'laboratories', labId });
  };

  const handleEquipmentClick = (equipmentId: string) => {
    if (equipmentId === 'oscilloscope') {
      setView({ page: 'equipment', labId: null });
    }
  };

  const handleLogin = (user: AllowedUser) => {
    setCurrentUser(user);
    setIsResetPasswordMode(false);
  };

  const handleLogout = async () => {
    await signOutUser();
    setCurrentUser(null);
    setIsResetPasswordMode(false);
    setView({ page: 'laboratories', labId: null });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-utm-maroon border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 font-medium">Loading lab data...</p>
        </div>
      </div>
    );
  }

  if (isResetPasswordMode || !currentUser) {
    return (
      <LoginPage
        onLogin={handleLogin}
        isResetPasswordMode={isResetPasswordMode}
      />
    );
  }

  const renderContent = () => {
    if (view.page === 'laboratories' && view.labId === 'advanced-electronics') {
      return (
        <AdvancedElectronics
          onBack={() => setView({ page: 'laboratories', labId: null })}
          onEquipmentClick={handleEquipmentClick}
        />
      );
    }

    switch (view.page) {
      case 'laboratories':
        return <LaboratoryList onLabClick={handleLabClick} />;
      case 'equipment':
        return (
          <EquipmentAvailability
            userRole={currentUser.role}
            currentUserEmail={currentUser.email}
            onSuccessRedirect={() => setView({ page: 'applications', labId: null })}
          />
        );
      case 'applications':
        return (
          <ApplicationStatus
            userRole={currentUser.role}
            currentUserEmail={currentUser.email}
          />
        );
      case 'inventory':
        return (
          <InventoryManagement
            userRole={currentUser.role}
            currentUserEmail={currentUser.email}
          />
        );
      case 'staff':
        return <StaffOnDuty />;
    }
  };

  const activePage: ActivePage = view.page;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar activePage={activePage} onNavigate={navigateToPage} userRole={currentUser.role} />

      <div className="ml-64 min-h-screen flex flex-col">
        <Header activePage={activePage} user={currentUser} onLogout={handleLogout} />

        <main className="flex-1 p-8">{renderContent()}</main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainDashboardApp />
    </AppProvider>
  );
}
