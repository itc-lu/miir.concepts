'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { UserProfile, UserRole } from '@/types/database.types';
import { hasPermission, hasAnyPermission, isAdmin, isGlobalAdmin, type Permission } from '@/lib/permissions';

interface UserContextType {
  user: UserProfile | null;
  role: UserRole | null;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  isAdmin: boolean;
  isGlobalAdmin: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
  user: UserProfile | null;
}

export function UserProvider({ children, user }: UserProviderProps) {
  const role = user?.role ?? null;

  const value: UserContextType = {
    user,
    role,
    hasPermission: (permission: Permission) => hasPermission(role, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(role, permissions),
    isAdmin: isAdmin(role),
    isGlobalAdmin: isGlobalAdmin(role),
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
