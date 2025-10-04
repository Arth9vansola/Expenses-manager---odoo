// Mobile Navigation Component with Responsive Design
import React, { useState, useEffect } from 'react';
import '../styles/responsive.css';

const MobileNavigation = ({ 
  user, 
  currentPage, 
  onNavigate, 
  onLogout,
  isOffline = false,
  syncPending = 0 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showOfflineStatus, setShowOfflineStatus] = useState(false);

  // Navigation items based on user role
  const getNavigationItems = () => {
    const commonItems = [
      { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard' },
      { id: 'expenses', label: 'Expenses', icon: '💰', path: '/expenses' },
      { id: 'submit', label: 'Submit', icon: '➕', path: '/submit' },
    ];

    if (user?.role === 'manager') {
      return [
        ...commonItems,
        { id: 'approvals', label: 'Approvals', icon: '✅', path: '/approvals' },
        { id: 'team', label: 'Team', icon: '👥', path: '/team' },
      ];
    }

    if (user?.role === 'admin') {
      return [
        ...commonItems,
        { id: 'approvals', label: 'Approvals', icon: '✅', path: '/approvals' },
        { id: 'admin', label: 'Admin', icon: '⚙️', path: '/admin' },
        { id: 'reports', label: 'Reports', icon: '📈', path: '/reports' },
      ];
    }

    return commonItems;
  };

  // Handle offline status
  useEffect(() => {
    if (isOffline) {
      setShowOfflineStatus(true);
      const timer = setTimeout(() => setShowOfflineStatus(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOffline]);

  const navigationItems = getNavigationItems();

  const handleItemClick = (item) => {
    setIsMenuOpen(false);
    onNavigate(item.path);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="mobile-header-content">
          {/* App Logo/Title */}
          <div className="mobile-app-title">
            <span className="app-icon">💸</span>
            <h1>ExpenseApp</h1>
          </div>

          {/* Status Indicators */}
          <div className="mobile-status-indicators">
            {isOffline && (
              <div className="offline-indicator" title="Offline Mode">
                📶
              </div>
            )}
            {syncPending > 0 && (
              <div className="sync-pending" title={`${syncPending} items pending sync`}>
                🔄 {syncPending}
              </div>
            )}
          </div>

          {/* Menu Toggle Button */}
          <button 
            className={`mobile-menu-toggle ${isMenuOpen ? 'active' : ''}`}
            onClick={toggleMenu}
            aria-label="Toggle navigation menu"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>
        </div>

        {/* Offline Status Banner */}
        {showOfflineStatus && (
          <div className="offline-status-banner">
            <span className="offline-icon">📶</span>
            <span>You're offline. Changes will sync when connected.</span>
            <button 
              className="dismiss-offline-status"
              onClick={() => setShowOfflineStatus(false)}
            >
              ✕
            </button>
          </div>
        )}
      </header>

      {/* Mobile Navigation Overlay */}
      <div className={`mobile-nav-overlay ${isMenuOpen ? 'active' : ''}`} onClick={closeMenu} />

      {/* Mobile Navigation Menu */}
      <nav className={`mobile-nav ${isMenuOpen ? 'open' : ''}`}>
        {/* User Info Section */}
        <div className="mobile-nav-user">
          <div className="user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-role">{user?.role || 'Employee'}</div>
            <div className="user-department">{user?.department || ''}</div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="mobile-nav-items">
          {navigationItems.map(item => (
            <button
              key={item.id}
              className={`mobile-nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => handleItemClick(item)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {currentPage === item.id && <span className="active-indicator" />}
            </button>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mobile-nav-actions">
          <button className="nav-action-btn" onClick={() => handleItemClick({ path: '/submit' })}>
            <span className="action-icon">➕</span>
            <span>Quick Submit</span>
          </button>
          
          <button className="nav-action-btn" onClick={() => handleItemClick({ path: '/camera' })}>
            <span className="action-icon">📷</span>
            <span>Scan Receipt</span>
          </button>
        </div>

        {/* Footer Actions */}
        <div className="mobile-nav-footer">
          <button 
            className="nav-footer-btn"
            onClick={() => handleItemClick({ path: '/profile' })}
          >
            <span className="footer-icon">👤</span>
            <span>Profile</span>
          </button>
          
          <button 
            className="nav-footer-btn"
            onClick={() => handleItemClick({ path: '/settings' })}
          >
            <span className="footer-icon">⚙️</span>
            <span>Settings</span>
          </button>
          
          <button 
            className="nav-footer-btn logout-btn"
            onClick={() => {
              closeMenu();
              onLogout();
            }}
          >
            <span className="footer-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Bottom Tab Bar for Quick Access (Alternative Navigation) */}
      <nav className="mobile-tab-bar">
        {navigationItems.slice(0, 4).map(item => (
          <button
            key={`tab-${item.id}`}
            className={`tab-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => handleItemClick(item)}
          >
            <span className="tab-icon">{item.icon}</span>
            <span className="tab-label">{item.label}</span>
          </button>
        ))}
        
        {navigationItems.length > 4 && (
          <button
            className="tab-item"
            onClick={toggleMenu}
          >
            <span className="tab-icon">☰</span>
            <span className="tab-label">More</span>
          </button>
        )}
      </nav>

      {/* Floating Action Button for Quick Submit */}
      <button 
        className="fab-submit"
        onClick={() => handleItemClick({ path: '/submit' })}
        title="Quick Submit Expense"
      >
        <span className="fab-icon">➕</span>
      </button>
    </>
  );
};

// Desktop Navigation Component (Sidebar)
const DesktopNavigation = ({ 
  user, 
  currentPage, 
  onNavigate, 
  onLogout,
  isOffline = false,
  syncPending = 0,
  isCollapsed = false,
  onToggleCollapse 
}) => {
  const getNavigationItems = () => {
    const commonItems = [
      { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/dashboard' },
      { id: 'expenses', label: 'My Expenses', icon: '💰', path: '/expenses' },
      { id: 'submit', label: 'Submit Expense', icon: '➕', path: '/submit' },
    ];

    if (user?.role === 'manager') {
      return [
        ...commonItems,
        { id: 'approvals', label: 'Approvals', icon: '✅', path: '/approvals' },
        { id: 'team', label: 'Team Expenses', icon: '👥', path: '/team' },
        { id: 'reports', label: 'Reports', icon: '📈', path: '/reports' },
      ];
    }

    if (user?.role === 'admin') {
      return [
        ...commonItems,
        { id: 'approvals', label: 'Approvals', icon: '✅', path: '/approvals' },
        { id: 'admin', label: 'Administration', icon: '⚙️', path: '/admin' },
        { id: 'reports', label: 'Reports', icon: '📈', path: '/reports' },
        { id: 'users', label: 'User Management', icon: '👥', path: '/users' },
      ];
    }

    return commonItems;
  };

  const navigationItems = getNavigationItems();

  return (
    <aside className={`desktop-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <span className="brand-icon">💸</span>
          {!isCollapsed && <span className="brand-text">ExpenseApp</span>}
        </div>
        
        <button 
          className="sidebar-toggle"
          onClick={onToggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* Status Indicators */}
      {(isOffline || syncPending > 0) && (
        <div className="sidebar-status">
          {isOffline && (
            <div className="status-item offline">
              <span className="status-icon">📶</span>
              {!isCollapsed && <span>Offline</span>}
            </div>
          )}
          {syncPending > 0 && (
            <div className="status-item sync">
              <span className="status-icon">🔄</span>
              {!isCollapsed && <span>{syncPending} pending</span>}
            </div>
          )}
        </div>
      )}

      {/* User Info */}
      <div className="sidebar-user">
        <div className="user-avatar-large">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        {!isCollapsed && (
          <div className="user-details">
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-role">{user?.role || 'Employee'}</div>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="sidebar-nav">
        {navigationItems.map(item => (
          <button
            key={item.id}
            className={`sidebar-nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.path)}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="nav-icon">{item.icon}</span>
            {!isCollapsed && <span className="nav-label">{item.label}</span>}
            {currentPage === item.id && <span className="active-indicator" />}
          </button>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <button 
          className="sidebar-footer-btn"
          onClick={() => onNavigate('/settings')}
          title={isCollapsed ? 'Settings' : undefined}
        >
          <span className="footer-icon">⚙️</span>
          {!isCollapsed && <span>Settings</span>}
        </button>
        
        <button 
          className="sidebar-footer-btn logout"
          onClick={onLogout}
          title={isCollapsed ? 'Logout' : undefined}
        >
          <span className="footer-icon">🚪</span>
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

// Main Responsive Navigation Component
const ResponsiveNavigation = ({ 
  user, 
  currentPage, 
  onNavigate, 
  onLogout,
  isOffline = false,
  syncPending = 0 
}) => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isDesktop) {
    return (
      <DesktopNavigation
        user={user}
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
        isOffline={isOffline}
        syncPending={syncPending}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
    );
  }

  return (
    <MobileNavigation
      user={user}
      currentPage={currentPage}
      onNavigate={onNavigate}
      onLogout={onLogout}
      isOffline={isOffline}
      syncPending={syncPending}
    />
  );
};

export default ResponsiveNavigation;
export { MobileNavigation, DesktopNavigation };