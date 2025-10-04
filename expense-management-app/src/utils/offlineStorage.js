// Offline Storage Manager
// Handles local storage, caching, and offline synchronization

class OfflineStorage {
  constructor() {
    this.storageKeys = {
      USER_DATA: 'expense_app_user',
      EXPENSES: 'expense_app_expenses',
      USERS: 'expense_app_users',
      APPROVALS: 'expense_app_approvals',
      RULES: 'expense_app_rules',
      COUNTRIES: 'expense_app_countries',
      CURRENCIES: 'expense_app_currencies',
      SYNC_QUEUE: 'expense_app_sync_queue',
      LAST_SYNC: 'expense_app_last_sync',
      APP_VERSION: 'expense_app_version',
      OFFLINE_MODE: 'expense_app_offline_mode',
      CACHED_IMAGES: 'expense_app_cached_images'
    };

    this.currentVersion = '1.0.0';
    this.syncQueue = this.getSyncQueue();
    this.isOnline = navigator.onLine;
    this.initializeEventListeners();
  }

  // Initialize online/offline event listeners
  initializeEventListeners() {
    window.addEventListener('online', () => {
      console.log('App is online');
      this.isOnline = true;
      this.setOfflineMode(false);
      this.syncWhenOnline();
    });

    window.addEventListener('offline', () => {
      console.log('App is offline');
      this.isOnline = false;
      this.setOfflineMode(true);
    });

    // Initialize offline mode state
    this.setOfflineMode(!this.isOnline);
  }

  // Generic storage operations
  setItem(key, value) {
    try {
      const data = {
        value,
        timestamp: Date.now(),
        version: this.currentVersion
      };
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return false;
    }
  }

  getItem(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(key);
      if (!data) return defaultValue;
      
      const parsed = JSON.parse(data);
      
      // Check version compatibility
      if (parsed.version !== this.currentVersion) {
        console.warn(`Version mismatch for ${key}, clearing data`);
        this.removeItem(key);
        return defaultValue;
      }
      
      return parsed.value;
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return defaultValue;
    }
  }

  removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
      return false;
    }
  }

  // User data management
  saveUserData(userData) {
    return this.setItem(this.storageKeys.USER_DATA, userData);
  }

  getUserData() {
    return this.getItem(this.storageKeys.USER_DATA);
  }

  clearUserData() {
    return this.removeItem(this.storageKeys.USER_DATA);
  }

  // Expenses management
  saveExpenses(expenses) {
    return this.setItem(this.storageKeys.EXPENSES, expenses);
  }

  getExpenses() {
    return this.getItem(this.storageKeys.EXPENSES, []);
  }

  addExpense(expense) {
    const expenses = this.getExpenses();
    const newExpense = {
      ...expense,
      id: expense.id || Date.now().toString(),
      createdAt: expense.createdAt || new Date().toISOString(),
      synced: false // Mark as unsynced for offline operations
    };
    
    expenses.push(newExpense);
    this.saveExpenses(expenses);
    
    // Add to sync queue if offline
    if (!this.isOnline) {
      this.addToSyncQueue('CREATE_EXPENSE', newExpense);
    }
    
    return newExpense;
  }

  updateExpense(expenseId, updates) {
    const expenses = this.getExpenses();
    const index = expenses.findIndex(exp => exp.id === expenseId);
    
    if (index !== -1) {
      expenses[index] = {
        ...expenses[index],
        ...updates,
        updatedAt: new Date().toISOString(),
        synced: false
      };
      
      this.saveExpenses(expenses);
      
      if (!this.isOnline) {
        this.addToSyncQueue('UPDATE_EXPENSE', expenses[index]);
      }
      
      return expenses[index];
    }
    
    return null;
  }

  deleteExpense(expenseId) {
    const expenses = this.getExpenses();
    const filteredExpenses = expenses.filter(exp => exp.id !== expenseId);
    
    if (filteredExpenses.length !== expenses.length) {
      this.saveExpenses(filteredExpenses);
      
      if (!this.isOnline) {
        this.addToSyncQueue('DELETE_EXPENSE', { id: expenseId });
      }
      
      return true;
    }
    
    return false;
  }

  // Users management
  saveUsers(users) {
    return this.setItem(this.storageKeys.USERS, users);
  }

  getUsers() {
    return this.getItem(this.storageKeys.USERS, []);
  }

  // Approvals management
  saveApprovals(approvals) {
    return this.setItem(this.storageKeys.APPROVALS, approvals);
  }

  getApprovals() {
    return this.getItem(this.storageKeys.APPROVALS, []);
  }

  // Rules management
  saveRules(rules) {
    return this.setItem(this.storageKeys.RULES, rules);
  }

  getRules() {
    return this.getItem(this.storageKeys.RULES, []);
  }

  // Countries and currencies
  saveCountries(countries) {
    return this.setItem(this.storageKeys.COUNTRIES, countries);
  }

  getCountries() {
    return this.getItem(this.storageKeys.COUNTRIES, []);
  }

  saveCurrencies(currencies) {
    return this.setItem(this.storageKeys.CURRENCIES, currencies);
  }

  getCurrencies() {
    return this.getItem(this.storageKeys.CURRENCIES, []);
  }

  // Image caching for receipts
  saveImageCache(imageId, imageData) {
    const cachedImages = this.getItem(this.storageKeys.CACHED_IMAGES, {});
    cachedImages[imageId] = {
      data: imageData,
      timestamp: Date.now()
    };
    return this.setItem(this.storageKeys.CACHED_IMAGES, cachedImages);
  }

  getImageCache(imageId) {
    const cachedImages = this.getItem(this.storageKeys.CACHED_IMAGES, {});
    return cachedImages[imageId]?.data || null;
  }

  clearExpiredImageCache(maxAgeHours = 24) {
    const cachedImages = this.getItem(this.storageKeys.CACHED_IMAGES, {});
    const maxAge = maxAgeHours * 60 * 60 * 1000; // Convert to milliseconds
    const now = Date.now();
    
    Object.keys(cachedImages).forEach(imageId => {
      if (now - cachedImages[imageId].timestamp > maxAge) {
        delete cachedImages[imageId];
      }
    });
    
    return this.setItem(this.storageKeys.CACHED_IMAGES, cachedImages);
  }

  // Sync queue management
  getSyncQueue() {
    return this.getItem(this.storageKeys.SYNC_QUEUE, []);
  }

  addToSyncQueue(action, data) {
    const queue = this.getSyncQueue();
    queue.push({
      id: Date.now().toString(),
      action,
      data,
      timestamp: Date.now(),
      retries: 0
    });
    this.setItem(this.storageKeys.SYNC_QUEUE, queue);
  }

  clearSyncQueue() {
    return this.setItem(this.storageKeys.SYNC_QUEUE, []);
  }

  // Sync operations
  async syncWhenOnline() {
    if (!this.isOnline) return;

    const queue = this.getSyncQueue();
    if (queue.length === 0) return;

    console.log(`Syncing ${queue.length} pending operations...`);

    const results = [];
    
    for (const item of queue) {
      try {
        const result = await this.processSyncItem(item);
        results.push({ item, success: true, result });
      } catch (error) {
        console.error('Sync error for item:', item, error);
        
        // Increment retry count
        item.retries = (item.retries || 0) + 1;
        
        // Remove from queue if max retries reached
        if (item.retries >= 3) {
          results.push({ item, success: false, error: 'Max retries reached' });
        } else {
          results.push({ item, success: false, error: error.message, retry: true });
        }
      }
    }

    // Update queue with failed items (for retry)
    const failedItems = results
      .filter(r => !r.success && r.retry)
      .map(r => r.item);
    
    this.setItem(this.storageKeys.SYNC_QUEUE, failedItems);
    this.setItem(this.storageKeys.LAST_SYNC, Date.now());

    return results;
  }

  async processSyncItem(item) {
    switch (item.action) {
      case 'CREATE_EXPENSE':
        // Here you would call your actual API
        console.log('Syncing create expense:', item.data);
        // return await api.createExpense(item.data);
        break;
        
      case 'UPDATE_EXPENSE':
        console.log('Syncing update expense:', item.data);
        // return await api.updateExpense(item.data.id, item.data);
        break;
        
      case 'DELETE_EXPENSE':
        console.log('Syncing delete expense:', item.data);
        // return await api.deleteExpense(item.data.id);
        break;
        
      default:
        throw new Error(`Unknown sync action: ${item.action}`);
    }
  }

  // Offline mode management
  setOfflineMode(isOffline) {
    this.setItem(this.storageKeys.OFFLINE_MODE, isOffline);
    
    // Dispatch custom event for UI updates
    window.dispatchEvent(new CustomEvent('offlineStateChanged', {
      detail: { isOffline }
    }));
  }

  getOfflineMode() {
    return this.getItem(this.storageKeys.OFFLINE_MODE, false);
  }

  // Storage statistics
  getStorageStats() {
    const stats = {
      totalItems: 0,
      totalSize: 0,
      itemStats: {}
    };

    Object.entries(this.storageKeys).forEach(([key, storageKey]) => {
      try {
        const data = localStorage.getItem(storageKey);
        if (data) {
          stats.totalItems++;
          stats.totalSize += data.length;
          stats.itemStats[key] = {
            size: data.length,
            lastModified: JSON.parse(data).timestamp
          };
        }
      } catch (error) {
        console.warn(`Error reading stats for ${key}:`, error);
      }
    });

    return stats;
  }

  // Clear all data
  clearAllData() {
    Object.values(this.storageKeys).forEach(key => {
      this.removeItem(key);
    });
  }

  // Alias methods for backwards compatibility
  setData(key, value) {
    return this.setItem(key, value);
  }

  getData(key, defaultValue = null) {
    return this.getItem(key, defaultValue);
  }

  removeData(key) {
    return this.removeItem(key);
  }

  clearAll() {
    return this.clearAllData();
  }

  // Export/Import data
  exportData() {
    const data = {};
    Object.entries(this.storageKeys).forEach(([key, storageKey]) => {
      data[key] = this.getItem(storageKey);
    });
    return data;
  }

  importData(data) {
    Object.entries(data).forEach(([key, value]) => {
      if (this.storageKeys[key] && value !== null) {
        this.setItem(this.storageKeys[key], value);
      }
    });
  }
}

// Create singleton instance
const offlineStorage = new OfflineStorage();

// Export for use in components
export { offlineStorage };
export default offlineStorage;

// Export utility functions
export const useOfflineStorage = () => {
  return offlineStorage;
};

export const isOffline = () => {
  return !navigator.onLine || offlineStorage.getOfflineMode();
};

export const getStorageQuota = async () => {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota,
        usage: estimate.usage,
        available: estimate.quota - estimate.usage,
        usagePercentage: (estimate.usage / estimate.quota) * 100
      };
    } catch (error) {
      console.warn('Could not estimate storage:', error);
    }
  }
  return null;
};