import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ResponsiveNavigation from './components/ResponsiveNavigation';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ApprovalRulesPage from './pages/ApprovalRulesPage';
import ComponentShowcase from './pages/ComponentShowcase';
import offlineStorage from './utils/offlineStorage';
import './styles/global.css';
import './styles/states.css';
import './styles/responsive.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncPending, setSyncPending] = useState(0);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  // Initialize offline functionality
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize offline storage
        await offlineStorage.initialize();

        // Check for existing user session
        const savedUser = await offlineStorage.getData('currentUser');
        if (savedUser) {
          setUser(savedUser);
        }

        // Get sync queue count
        const queueCount = await offlineStorage.getSyncQueueCount();
        setSyncPending(queueCount);

        // Set up online/offline listeners
        const handleOnline = async () => {
          setIsOffline(false);
          console.log('App is back online, initiating sync...');
          
          try {
            await offlineStorage.syncWhenOnline();
            const updatedQueueCount = await offlineStorage.getSyncQueueCount();
            setSyncPending(updatedQueueCount);
          } catch (error) {
            console.error('Sync failed:', error);
          }
        };

        const handleOffline = () => {
          setIsOffline(true);
          console.log('App is offline');
        };

        const handleResize = () => {
          setIsDesktop(window.innerWidth >= 768);
        };

        // Listen for events
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('resize', handleResize);

        // Listen for sync updates
        const handleSyncUpdate = (event) => {
          setSyncPending(event.detail.queueCount);
        };

        window.addEventListener('offlineStorageSync', handleSyncUpdate);

        setLoading(false);

        // Cleanup function
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('offlineStorageSync', handleSyncUpdate);
        };
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Handle route changes to update current page
  useEffect(() => {
    const path = window.location.pathname;
    const pageName = path.split('/')[1] || 'dashboard';
    setCurrentPage(pageName);
  }, []);

  const handleLogin = async (userData) => {
    setUser(userData);
    await offlineStorage.setData('currentUser', userData);
  };

  const handleLogout = async () => {
    setUser(null);
    await offlineStorage.removeData('currentUser');
    
    // Optional: Clear all user data on logout
    if (window.confirm('Clear all offline data?')) {
      await offlineStorage.clearAll();
    }
  };

  const handleNavigate = (path) => {
    window.history.pushState(null, '', path);
    const pageName = path.split('/')[1] || 'dashboard';
    setCurrentPage(pageName);
    
    // Trigger a popstate event to update React Router
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const getDashboardComponent = () => {
    if (!user) return <Navigate to="/login" />;
    
    switch (user.role) {
      case 'admin':
        return <AdminDashboard user={user} isOffline={isOffline} syncPending={syncPending} />;
      case 'manager':
        return <ManagerDashboard user={user} isOffline={isOffline} syncPending={syncPending} />;
      case 'employee':
      default:
        return <EmployeeDashboard user={user} isOffline={isOffline} syncPending={syncPending} />;
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">🔄</div>
        <p>Initializing ExpenseApp...</p>
        <div className="loading-details">
          <small>Setting up offline functionality...</small>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App responsive-app">
        {/* Use responsive navigation on mobile, traditional navbar on desktop */}
        {user && (
          <>
            {isDesktop ? (
              <Navbar user={user} onLogout={handleLogout} />
            ) : (
              <ResponsiveNavigation 
                user={user} 
                currentPage={currentPage}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
                isOffline={isOffline}
                syncPending={syncPending}
              />
            )}
          </>
        )}
        
        {/* Main Content */}
        <main className={`main-content ${user ? 'with-navigation' : 'login-mode'}`}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={
              <Login 
                onLogin={handleLogin} 
                isOffline={isOffline}
              />
            } />
            <Route path="/signup" element={
              <Signup 
                onLogin={handleLogin} 
                isOffline={isOffline}
              />
            } />
            <Route path="/dashboard" element={getDashboardComponent()} />
            <Route path="/admin/approval-rules" element={
              user?.role === 'admin' ? (
                <ApprovalRulesPage 
                  user={user} 
                  isOffline={isOffline}
                />
              ) : (
                <Navigate to="/dashboard" />
              )
            } />
            <Route path="/components" element={<ComponentShowcase />} />
          </Routes>
        </main>

        {/* Global Offline Indicator */}
        {isOffline && (
          <div className="global-offline-indicator">
            <span className="offline-icon">📶</span>
            <span className="offline-text">Offline Mode</span>
            {syncPending > 0 && (
              <span className="sync-count">{syncPending} pending</span>
            )}
          </div>
        )}

        {/* PWA Install Prompt */}
        <PWAInstallPrompt />

        {/* Service Worker Update Prompt */}
        <ServiceWorkerUpdatePrompt />
      </div>
    </Router>
  );
}

// PWA Install Prompt Component
const PWAInstallPrompt = () => {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
  };

  if (!showInstallPrompt) return null;

  return (
    <div className="pwa-install-prompt">
      <div className="install-prompt-content">
        <span className="install-icon">📱</span>
        <div className="install-text">
          <strong>Install ExpenseApp</strong>
          <small>Add to your home screen for easy access</small>
        </div>
        <div className="install-actions">
          <button className="install-btn" onClick={handleInstall}>
            Install
          </button>
          <button className="dismiss-btn" onClick={handleDismiss}>
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

// Service Worker Update Prompt Component
const ServiceWorkerUpdatePrompt = () => {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setShowUpdatePrompt(true);
      });
    }
  }, []);

  const handleUpdate = () => {
    window.location.reload();
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
  };

  if (!showUpdatePrompt) return null;

  return (
    <div className="sw-update-prompt">
      <div className="update-prompt-content">
        <span className="update-icon">🔄</span>
        <div className="update-text">
          <strong>New version available</strong>
          <small>Restart to get the latest features</small>
        </div>
        <div className="update-actions">
          <button className="update-btn" onClick={handleUpdate}>
            Update
          </button>
          <button className="dismiss-btn" onClick={handleDismiss}>
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
