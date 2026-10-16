import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AdminRole, AdminUser } from '../types';
import {
  verifyAdminPassword,
  changeAdminPassword,
  initializeAdminAuth,
} from '../services/authService';

interface AdminContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  login: (username: string, password?: string, role?: AdminRole) => Promise<boolean>;
  logout: () => void;
  hasRole: (roles: AdminRole[]) => boolean;
  changePassword: (
    currentPass: string,
    newPass: string,
    confirmPass: string
  ) => Promise<{ success: boolean; messageEn: string; messageAr: string }>;
}

const DEMO_USERS: Record<string, AdminUser> = {
  admin: {
    id: 'u-1',
    username: 'admin',
    name: 'Ahmad Arnaout',
    role: 'super_admin',
    email: 'admin@arnaoutcell.com',
  },
  products: {
    id: 'u-2',
    username: 'products',
    name: 'Karim Product Specialist',
    role: 'product_manager',
    email: 'products@arnaoutcell.com',
  },
  orders: {
    id: 'u-3',
    username: 'orders',
    name: 'Lina Order Operations',
    role: 'order_manager',
    email: 'orders@arnaoutcell.com',
  },
  inventory: {
    id: 'u-4',
    username: 'inventory',
    name: 'Tarek Saida Warehouse',
    role: 'inventory_manager',
    email: 'inventory@arnaoutcell.com',
  },
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('arnaout_admin_user');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  // Ensure security credentials system is initialized on mount
  useEffect(() => {
    initializeAdminAuth().catch(console.error);
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('arnaout_admin_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('arnaout_admin_user');
    }
  }, [user]);

  const login = async (
    username: string,
    password?: string,
    role?: AdminRole
  ): Promise<boolean> => {
    const trimmedUser = username.toLowerCase().trim();
    if (!trimmedUser) return false;

    // Verify password securely if provided
    if (password) {
      const isValid = await verifyAdminPassword(password);
      if (!isValid) {
        return false;
      }
    }

    if (DEMO_USERS[trimmedUser]) {
      setUser(DEMO_USERS[trimmedUser]);
      return true;
    }

    // Custom role login
    if (role && trimmedUser.length >= 3) {
      const newUser: AdminUser = {
        id: `u-${Date.now()}`,
        username: trimmedUser,
        name: trimmedUser.charAt(0).toUpperCase() + trimmedUser.slice(1),
        role,
        email: `${trimmedUser}@arnaoutcell.com`,
      };
      setUser(newUser);
      return true;
    }

    // Default to super_admin if authorized
    setUser({
      id: `u-${Date.now()}`,
      username: trimmedUser,
      name: trimmedUser.charAt(0).toUpperCase() + trimmedUser.slice(1),
      role: role || 'super_admin',
      email: `${trimmedUser}@arnaoutcell.com`,
    });
    return true;
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('arnaout_admin_session_token');
    }
  };

  const hasRole = (allowedRoles: AdminRole[]): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return allowedRoles.includes(user.role);
  };

  const handleChangePassword = async (
    currentPass: string,
    newPass: string,
    confirmPass: string
  ) => {
    const res = await changeAdminPassword(currentPass, newPass, confirmPass);
    return res;
  };

  return (
    <AdminContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        hasRole,
        changePassword: handleChangePassword,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
