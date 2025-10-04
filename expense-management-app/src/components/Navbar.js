import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  const getUserInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          ExpenseTracker Pro
        </Link>
        
        <div className="nav-menu">
          {user ? (
            <>
              <div className="nav-links">
                <Link to="/dashboard" className="nav-link">Dashboard</Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className="nav-link">Admin</Link>
                )}
                {user.role === 'manager' && (
                  <Link to="/manager" className="nav-link">Manager</Link>
                )}
              </div>
              <div className="nav-user-section">
                <div className="nav-user">
                  <div className="nav-user-avatar">
                    {getUserInitials(user.name)}
                  </div>
                  <span>Welcome, {user.name}</span>
                </div>
                <button onClick={handleLogout} className="nav-logout-btn">
                  <span>🚪</span>
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/signup" className="nav-link">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;