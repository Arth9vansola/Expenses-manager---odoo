// Authentication utilities for clearing stale sessions

/**
 * Clear all authentication data from localStorage and offline storage
 */
export const clearAuthSession = async () => {
  // Clear localStorage auth token
  localStorage.removeItem('authToken');
  
  // Clear offline storage user data
  try {
    const offlineStorage = await import('./offlineStorage');
    await offlineStorage.default.removeData('currentUser');
    console.log('Authentication session cleared successfully');
  } catch (error) {
    console.warn('Could not clear offline storage:', error);
  }
};

/**
 * Check if current auth token is valid
 */
export const validateAuthToken = async () => {
  const token = localStorage.getItem('authToken');
  if (!token) {
    return false;
  }

  try {
    const response = await fetch('http://localhost:8000/api/secure/users/profile/', {
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Token validation failed:', error);
    return false;
  }
};

/**
 * Force logout and clear all auth data
 */
export const forceLogout = async () => {
  await clearAuthSession();
  window.location.href = '/login';
};

export default {
  clearAuthSession,
  validateAuthToken,
  forceLogout
};