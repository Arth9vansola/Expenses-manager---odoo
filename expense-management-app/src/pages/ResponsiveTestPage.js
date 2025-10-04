// Responsive Design Test Page
import React, { useState, useEffect } from 'react';
import ResponsiveNavigation from '../components/ResponsiveNavigation';
import MobileExpenseForm from '../components/MobileExpenseForm';
import ResponsiveExpenseTable from '../components/ResponsiveExpenseTable';
import { useImageUpload } from '../utils/imageUpload';
import { offlineStorage } from '../utils/offlineStorage';
import '../styles/responsive.css';

const ResponsiveTestPage = () => {
  const [currentView, setCurrentView] = useState('overview');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [user] = useState({
    id: 1,
    name: 'Test User',
    role: 'employee',
    department: 'Engineering'
  });

  const [mockExpenses] = useState([
    {
      id: '1',
      title: 'Business Lunch',
      amount: 85.50,
      currency: 'USD',
      category: 'Meals',
      date: '2024-01-15',
      status: 'pending',
      submitterName: 'Test User',
      merchant: 'Restaurant ABC'
    },
    {
      id: '2',
      title: 'Office Supplies',
      amount: 124.99,
      currency: 'USD',
      category: 'Office Supplies',
      date: '2024-01-16',
      status: 'approved',
      submitterName: 'Test User',
      merchant: 'Office Depot'
    },
    {
      id: '3',
      title: 'Travel Accommodation',
      amount: 299.00,
      currency: 'USD',
      category: 'Travel',
      date: '2024-01-17',
      status: 'rejected',
      submitterName: 'Test User',
      merchant: 'Hotel XYZ'
    }
  ]);

  const { processImage, processing } = useImageUpload();

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleNavigate = (path) => {
    const page = path.split('/')[1] || 'overview';
    setCurrentView(page);
  };

  const handleExpenseSubmit = async (expenseData) => {
    console.log('Submitting expense:', expenseData);
    
    // Store offline
    await offlineStorage.setData('test_expense', expenseData);
    alert('Expense submitted successfully!');
    setCurrentView('expenses');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'submit':
        return (
          <MobileExpenseForm
            onSubmit={handleExpenseSubmit}
            onCancel={() => setCurrentView('overview')}
            isOffline={isOffline}
          />
        );
      
      case 'expenses':
        return (
          <div className="test-view">
            <h2>📱 Responsive Expense Table Test</h2>
            <ResponsiveExpenseTable
              expenses={mockExpenses}
              onExpenseClick={(expense) => alert(`Viewing expense: ${expense.title}`)}
              onEdit={(expense) => alert(`Editing expense: ${expense.title}`)}
              onDelete={(expense) => alert(`Deleting expense: ${expense.title}`)}
              currentUser={user}
              isOffline={isOffline}
            />
          </div>
        );

      case 'test-offline':
        return <OfflineTestComponent />;
      
      case 'test-responsive':
        return <ResponsiveTestComponent />;

      case 'test-image':
        return <ImageTestComponent processImage={processImage} processing={processing} />;

      default:
        return (
          <div className="test-overview">
            <h1>🎯 Responsive Design & Offline Test Suite</h1>
            
            <div className="test-cards">
              <div className="test-card">
                <h3>📱 Mobile Navigation</h3>
                <p>Test responsive navigation with hamburger menu, bottom tabs, and sidebar.</p>
                <div className="test-features">
                  <span className="feature-tag">✅ Touch Optimized</span>
                  <span className="feature-tag">✅ Role-Based Menus</span>
                  <span className="feature-tag">✅ Offline Indicators</span>
                </div>
              </div>

              <div className="test-card">
                <h3>📋 Mobile Forms</h3>
                <p>Test touch-optimized expense submission form with image upload.</p>
                <button 
                  className="test-btn"
                  onClick={() => setCurrentView('submit')}
                >
                  Test Form
                </button>
              </div>

              <div className="test-card">
                <h3>📊 Responsive Tables</h3>
                <p>Test adaptive table/card views for different screen sizes.</p>
                <button 
                  className="test-btn"
                  onClick={() => setCurrentView('expenses')}
                >
                  Test Table
                </button>
              </div>

              <div className="test-card">
                <h3>📶 Offline Functionality</h3>
                <p>Test offline data storage, sync queue, and network detection.</p>
                <button 
                  className="test-btn"
                  onClick={() => setCurrentView('test-offline')}
                >
                  Test Offline
                </button>
              </div>

              <div className="test-card">
                <h3>🎨 Responsive Design</h3>
                <p>Test breakpoints, touch targets, and mobile optimizations.</p>
                <button 
                  className="test-btn"
                  onClick={() => setCurrentView('test-responsive')}
                >
                  Test Responsive
                </button>
              </div>

              <div className="test-card">
                <h3>📸 Image Processing</h3>
                <p>Test image upload, compression, and optimization features.</p>
                <button 
                  className="test-btn"
                  onClick={() => setCurrentView('test-image')}
                >
                  Test Images
                </button>
              </div>
            </div>

            <div className="system-status">
              <h3>System Status</h3>
              <div className="status-items">
                <div className={`status-item ${isOffline ? 'offline' : 'online'}`}>
                  <span className="status-icon">
                    {isOffline ? '📶' : '🌐'}
                  </span>
                  <span>Network: {isOffline ? 'Offline' : 'Online'}</span>
                </div>
                
                <div className="status-item">
                  <span className="status-icon">📱</span>
                  <span>Screen: {window.innerWidth}x{window.innerHeight}</span>
                </div>
                
                <div className="status-item">
                  <span className="status-icon">🎯</span>
                  <span>Breakpoint: {getBreakpoint()}</span>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  const getBreakpoint = () => {
    const width = window.innerWidth;
    if (width < 768) return 'Mobile';
    if (width < 1024) return 'Tablet';
    return 'Desktop';
  };

  return (
    <div className="responsive-test-app">
      <ResponsiveNavigation
        user={user}
        currentPage={currentView}
        onNavigate={handleNavigate}
        onLogout={() => alert('Logout clicked')}
        isOffline={isOffline}
        syncPending={2}
      />
      
      <main className="test-main-content">
        {renderCurrentView()}
      </main>

      {/* Global offline indicator */}
      {isOffline && (
        <div className="global-offline-indicator">
          <span className="offline-icon">📶</span>
          <span>Offline Mode Active</span>
        </div>
      )}
    </div>
  );
};

// Offline Test Component
const OfflineTestComponent = () => {
  const [storageStats, setStorageStats] = useState(null);
  const [testData, setTestData] = useState('');

  useEffect(() => {
    loadStorageStats();
  }, []);

  const loadStorageStats = async () => {
    const stats = await offlineStorage.getStorageStats();
    setStorageStats(stats);
  };

  const testOfflineStorage = async () => {
    const testKey = 'offline_test_' + Date.now();
    const testValue = { message: testData, timestamp: new Date().toISOString() };
    
    await offlineStorage.setData(testKey, testValue);
    const retrieved = await offlineStorage.getData(testKey);
    
    alert(`Stored and retrieved: ${JSON.stringify(retrieved)}`);
    loadStorageStats();
  };

  const simulateOffline = () => {
    // Dispatch offline event
    window.dispatchEvent(new Event('offline'));
    setTimeout(() => {
      window.dispatchEvent(new Event('online'));
    }, 5000);
  };

  return (
    <div className="offline-test">
      <h2>📶 Offline Functionality Test</h2>
      
      <div className="test-section">
        <h3>Storage Statistics</h3>
        {storageStats && (
          <div className="storage-stats">
            <div>Used Space: {storageStats.usedSpace}</div>
            <div>Items Count: {storageStats.itemCount}</div>
            <div>Last Updated: {new Date(storageStats.lastUpdated).toLocaleString()}</div>
          </div>
        )}
      </div>

      <div className="test-section">
        <h3>Test Offline Storage</h3>
        <input
          type="text"
          placeholder="Enter test data"
          value={testData}
          onChange={(e) => setTestData(e.target.value)}
        />
        <button onClick={testOfflineStorage}>Store & Retrieve</button>
      </div>

      <div className="test-section">
        <h3>Network Simulation</h3>
        <button onClick={simulateOffline}>
          Simulate 5s Offline Period
        </button>
      </div>
    </div>
  );
};

// Responsive Design Test Component
const ResponsiveTestComponent = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="responsive-test">
      <h2>🎨 Responsive Design Test</h2>
      
      <div className="responsive-info">
        <h3>Current Viewport</h3>
        <p>Width: {windowSize.width}px</p>
        <p>Height: {windowSize.height}px</p>
        <p>Aspect Ratio: {(windowSize.width / windowSize.height).toFixed(2)}</p>
      </div>

      <div className="breakpoint-demo">
        <h3>Breakpoint Demo</h3>
        <div className="breakpoint-indicators">
          <div className="mobile-indicator">📱 Mobile (&lt; 768px)</div>
          <div className="tablet-indicator">📱 Tablet (768px - 1024px)</div>
          <div className="desktop-indicator">🖥️ Desktop (&gt; 1024px)</div>
        </div>
      </div>

      <div className="touch-targets">
        <h3>Touch Target Tests</h3>
        <p>Minimum 44px touch targets for accessibility:</p>
        <div className="touch-buttons">
          <button className="touch-button">44px Button</button>
          <button className="small-button">Small Button</button>
          <button className="large-button">Large Button</button>
        </div>
      </div>

      <div className="responsive-grid">
        <h3>Responsive Grid</h3>
        <div className="grid-container">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="grid-item">
              Item {i + 1}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Image Processing Test Component
const ImageTestComponent = ({ processImage, processing }) => {
  const [imageResult, setImageResult] = useState(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const result = await processImage(file);
      setImageResult(result);
    } catch (error) {
      alert('Image processing failed: ' + error.message);
    }
  };

  return (
    <div className="image-test">
      <h2>📸 Image Processing Test</h2>
      
      <div className="upload-section">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={processing}
        />
        {processing && <p>Processing image...</p>}
      </div>

      {imageResult && (
        <div className="image-results">
          <h3>Processing Results</h3>
          <div className="image-comparison">
            <div className="image-info">
              <h4>Original</h4>
              <p>Size: {imageResult.metadata.original.size} bytes</p>
              <p>Type: {imageResult.metadata.original.type}</p>
            </div>
            
            <div className="image-info">
              <h4>Processed</h4>
              <p>Size: {imageResult.metadata.processed.size} bytes</p>
              <p>Compression: {imageResult.metadata.compression.ratio}</p>
              <p>Dimensions: {imageResult.metadata.processed.width}x{imageResult.metadata.processed.height}</p>
            </div>
          </div>
          
          <div className="processed-image">
            <img src={imageResult.dataUrl} alt="Processed" style={{ maxWidth: '100%' }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponsiveTestPage;