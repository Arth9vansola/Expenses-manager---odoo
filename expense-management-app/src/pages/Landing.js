import React from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

const Landing = () => {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <nav className="landing-nav">
          <Link to="/" className="landing-logo">
            <div className="logo-icon">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="url(#gradient)"/>
                <path d="M8 12h16M8 16h16M8 20h12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32">
                    <stop stopColor="#667eea"/>
                    <stop offset="1" stopColor="#764ba2"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <span>ExpenseFlow</span>
          </Link>
          <div className="nav-menu">
            <a href="#features" className="nav-link">Features</a>
          </div>
          <div className="landing-nav-buttons">
            <Link to="/login" className="btn btn-ghost">
              Login
            </Link>
            <Link to="/signup" className="btn btn-primary">
              Get Started Free
            </Link>
          </div>
        </nav>
      </header>

      <main className="landing-main">
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-badge">
              <span>✨ New: Real-time Expense Analytics</span>
            </div>
            <h1 className="hero-title">
              Expense Management
              <span className="gradient-text">Simplified</span>
            </h1>
            <p className="hero-description">
              Transform your expense workflow with intelligent automation, real-time approvals, 
              and comprehensive analytics. Built for modern teams.
            </p>
            
            <div className="hero-actions">
              <Link to="/signup" className="cta-primary">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"/>
                </svg>
                Start Free Trial
              </Link>
              <button className="cta-secondary">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/>
                </svg>
                Watch Demo
              </button>
            </div>

            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">50K+</span>
                <span className="stat-label">Active Users</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">$10M+</span>
                <span className="stat-label">Expenses Processed</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">99.9%</span>
                <span className="stat-label">Uptime</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="dashboard-preview">
              <div className="preview-header">
                <div className="preview-nav">
                  <div className="nav-dot"></div>
                  <div className="nav-dot"></div>
                  <div className="nav-dot"></div>
                </div>
              </div>
              <div className="preview-content">
                <div className="preview-sidebar">
                  <div className="sidebar-item active">📊 Dashboard</div>
                  <div className="sidebar-item">💰 Expenses</div>
                  <div className="sidebar-item">✅ Approvals</div>
                  <div className="sidebar-item">📈 Reports</div>
                </div>
                <div className="preview-main">
                  <div className="preview-cards">
                    <div className="preview-card">
                      <div className="card-header">Total Expenses</div>
                      <div className="card-amount">$12,458</div>
                    </div>
                    <div className="preview-card">
                      <div className="card-header">Pending</div>
                      <div className="card-amount">$2,150</div>
                    </div>
                  </div>
                  <div className="preview-chart">
                    <div className="chart-bar" style={{height: '60%'}}></div>
                    <div className="chart-bar" style={{height: '80%'}}></div>
                    <div className="chart-bar" style={{height: '40%'}}></div>
                    <div className="chart-bar" style={{height: '90%'}}></div>
                    <div className="chart-bar" style={{height: '70%'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="features-section">
          <div className="section-header">
            <h2 className="section-title">Everything you need to manage expenses</h2>
            <p className="section-description">
              Powerful features designed to streamline your expense management workflow
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="feature-title">Smart Receipt Scanning</h3>
              <p className="feature-description">
                AI-powered OCR extracts expense details from receipts automatically
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="feature-title">Automated Approvals</h3>
              <p className="feature-description">
                Configurable approval workflows with real-time notifications
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="feature-title">Real-time Analytics</h3>
              <p className="feature-description">
                Comprehensive dashboards with spending insights and trends
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="feature-title">Enterprise Security</h3>
              <p className="feature-description">
                Bank-level security with SOC 2 compliance and encryption
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="feature-title">Team Collaboration</h3>
              <p className="feature-description">
                Multi-role access with department-based expense management
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="feature-title">API Integration</h3>
              <p className="feature-description">
                Connect with accounting software and ERP systems seamlessly
              </p>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="cta-container">
            <h2 className="cta-title">Ready to transform your expense management?</h2>
            <p className="cta-description">
              Join thousands of companies already using ExpenseFlow to streamline their finances
            </p>
            <div className="cta-actions">
              <Link to="/signup" className="btn btn-primary btn-lg">
                Start Free Trial
              </Link>
              <Link to="/login" className="btn btn-secondary btn-lg">
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-section">
              <div className="footer-logo">
                <div className="logo-icon">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <rect width="32" height="32" rx="8" fill="url(#gradient)"/>
                    <path d="M8 12h16M8 16h16M8 20h12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <defs>
                      <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32">
                        <stop stopColor="#667eea"/>
                        <stop offset="1" stopColor="#764ba2"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <span>ExpenseFlow</span>
              </div>
              <p className="footer-description">
                Modern expense management for forward-thinking teams.
              </p>
            </div>
            
            <div className="footer-section">
              <h4>Product</h4>
              <ul>
                <li><a href="#">Features</a></li>

                <li><a href="#">API</a></li>
                <li><a href="#">Integrations</a></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h4>Company</h4>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Careers</a></li>

              </ul>
            </div>
            
            <div className="footer-section">
              <h4>Support</h4>
              <ul>
                <li><a href="#">Help Center</a></li>
                <li><a href="#">Documentation</a></li>
                <li><a href="#">Status</a></li>
                <li><a href="#">Security</a></li>
              </ul>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>&copy; 2024 ExpenseFlow. All rights reserved.</p>
            <div className="footer-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;