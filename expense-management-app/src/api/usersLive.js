import { secureApiRequest, publicApiRequest } from './index';

// Individual function exports
export const loginUser = async (credentials) => {
  return publicApiRequest('/login/', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
};

export const registerUser = async (userData) => {
  return publicApiRequest('/signup/', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const requestPasswordReset = async (email) => {
  // TODO: Password reset endpoint not implemented yet
  console.warn('Password reset endpoint not implemented');
  return { success: false, error: 'Password reset feature not implemented yet' };
};

export const getAllUsers = async () => {
  return secureApiRequest('/users/');
};

export const getUserProfile = async () => {
  return secureApiRequest('/users/profile/');
};

export const updateUserProfile = async (userData) => {
  return secureApiRequest('/users/profile/', {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
};

export const createUser = async (userData) => {
  return secureApiRequest('/users/', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

export const updateUser = async (userId, userData) => {
  return secureApiRequest(`/users/${userId}/`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  });
};

export const deleteUser = async (userId) => {
  return secureApiRequest(`/users/${userId}/`, {
    method: 'DELETE',
  });
};

export const updateUserPermissions = async (userId, permissions) => {
  return secureApiRequest(`/users/${userId}/permissions/`, {
    method: 'PUT',
    body: JSON.stringify(permissions),
  });
};

export const getUserPermissions = async (userId) => {
  return secureApiRequest(`/users/${userId}/permissions/`);
};

// Utility function
export const getAvailableManagers = async () => {
  try {
    const response = await getAllUsers();
    if (response.success) {
      const users = response.data.results || response.data || [];
      return users.filter(user => user.role === 'manager' || user.role === 'admin');
    }
    return [];
  } catch (error) {
    console.error('Error getting available managers:', error);
    return [];
  }
};

// API object for backward compatibility
export const usersAPI = {
  loginUser,
  registerUser,
  requestPasswordReset,
  getAllUsers,
  getUserProfile,
  updateUserProfile,
  createUser,
  updateUser,
  deleteUser,
  updateUserPermissions,
  getUserPermissions,
  getAvailableManagers,
};

export default usersAPI;