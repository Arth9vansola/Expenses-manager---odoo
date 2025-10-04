// Mock user data service
export const mockUsers = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@test.com',
    role: 'admin',
    managerId: null,
    managerName: null,
    status: 'active',
    createdAt: '2024-01-15',
    lastLogin: '2024-10-04'
  },
  {
    id: 2,
    name: 'Manager User',
    email: 'manager@test.com',
    role: 'manager',
    managerId: 1,
    managerName: 'Admin User',
    status: 'active',
    createdAt: '2024-02-01',
    lastLogin: '2024-10-03'
  },
  {
    id: 3,
    name: 'Employee User',
    email: 'employee@test.com',
    role: 'employee',
    managerId: 2,
    managerName: 'Manager User',
    status: 'active',
    createdAt: '2024-02-15',
    lastLogin: '2024-10-04'
  },
  {
    id: 4,
    name: 'John Smith',
    email: 'john.smith@test.com',
    role: 'employee',
    managerId: 2,
    managerName: 'Manager User',
    status: 'active',
    createdAt: '2024-03-01',
    lastLogin: '2024-10-02'
  },
  {
    id: 5,
    name: 'Sarah Johnson',
    email: 'sarah.johnson@test.com',
    role: 'manager',
    managerId: 1,
    managerName: 'Admin User',
    status: 'inactive',
    createdAt: '2024-03-15',
    lastLogin: '2024-09-30'
  }
];

// User management API functions
export const userAPI = {
  getAllUsers: () => {
    return Promise.resolve([...mockUsers]);
  },

  createUser: (userData) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newUser = {
          id: Date.now(),
          ...userData,
          status: 'active',
          createdAt: new Date().toISOString().split('T')[0],
          lastLogin: null
        };
        mockUsers.push(newUser);
        resolve(newUser);
      }, 1000);
    });
  },

  updateUser: (userId, userData) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const userIndex = mockUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          mockUsers[userIndex] = { ...mockUsers[userIndex], ...userData };
          resolve(mockUsers[userIndex]);
        }
      }, 800);
    });
  },

  deleteUser: (userId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const userIndex = mockUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          mockUsers.splice(userIndex, 1);
          resolve(true);
        }
      }, 500);
    });
  },

  resetPassword: (userId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock password reset - in real app, would send email
        resolve({ message: 'Password reset email sent successfully' });
      }, 1000);
    });
  },

  sendInvitation: (email, role, managerId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock invitation sending
        resolve({ message: `Invitation sent to ${email}` });
      }, 1200);
    });
  },

  getUserStats: () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const stats = {
          totalUsers: mockUsers.length,
          activeUsers: mockUsers.filter(u => u.status === 'active').length,
          pendingInvitations: 0, // Mock value
          adminCount: mockUsers.filter(u => u.role === 'admin').length,
          managerCount: mockUsers.filter(u => u.role === 'manager').length,
          employeeCount: mockUsers.filter(u => u.role === 'employee').length
        };
        resolve(stats);
      }, 500);
    });
  },

  getUsers: () => {
    return Promise.resolve([...mockUsers]);
  }
};

export const getUsersByRole = (users, role) => {
  return users.filter(user => user.role === role);
};

export const getAvailableManagers = (users) => {
  return users.filter(user => user.role === 'manager' && user.status === 'active');
};