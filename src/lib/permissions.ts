// Role-based permission system for CAT
import type { UserRole } from '@/types/database.types';

// Permission types
export type Permission =
  // User management
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:delete'
  // Cinema management
  | 'cinemas:read'
  | 'cinemas:create'
  | 'cinemas:update'
  | 'cinemas:delete'
  // Cinema groups
  | 'cinema_groups:read'
  | 'cinema_groups:create'
  | 'cinema_groups:update'
  | 'cinema_groups:delete'
  // Countries
  | 'countries:read'
  | 'countries:create'
  | 'countries:update'
  | 'countries:delete'
  // Reference tables (formats, technologies, languages, genres, age_ratings, tags)
  | 'reference:read'
  | 'reference:create'
  | 'reference:update'
  | 'reference:delete'
  // Movies
  | 'movies:read'
  | 'movies:create'
  | 'movies:update'
  | 'movies:delete'
  // Sessions
  | 'sessions:read'
  | 'sessions:create'
  | 'sessions:update'
  | 'sessions:delete'
  // Export clients
  | 'export_clients:read'
  | 'export_clients:create'
  | 'export_clients:update'
  | 'export_clients:delete';

// Role permission matrix
const rolePermissions: Record<UserRole, Permission[]> = {
  global_admin: [
    // Full access to everything
    'users:read', 'users:create', 'users:update', 'users:delete',
    'cinemas:read', 'cinemas:create', 'cinemas:update', 'cinemas:delete',
    'cinema_groups:read', 'cinema_groups:create', 'cinema_groups:update', 'cinema_groups:delete',
    'countries:read', 'countries:create', 'countries:update', 'countries:delete',
    'reference:read', 'reference:create', 'reference:update', 'reference:delete',
    'movies:read', 'movies:create', 'movies:update', 'movies:delete',
    'sessions:read', 'sessions:create', 'sessions:update', 'sessions:delete',
    'export_clients:read', 'export_clients:create', 'export_clients:update', 'export_clients:delete',
  ],
  internal_admin: [
    // No user management, but CRUD on everything else
    'cinemas:read', 'cinemas:create', 'cinemas:update', 'cinemas:delete',
    'cinema_groups:read', 'cinema_groups:create', 'cinema_groups:update', 'cinema_groups:delete',
    'countries:read', 'countries:create', 'countries:update', 'countries:delete',
    'reference:read', 'reference:create', 'reference:update', 'reference:delete',
    'movies:read', 'movies:create', 'movies:update', 'movies:delete',
    'sessions:read', 'sessions:create', 'sessions:update', 'sessions:delete',
    'export_clients:read', 'export_clients:create', 'export_clients:update', 'export_clients:delete',
  ],
  internal_user: [
    // No delete, no country/cinema/cinema-group modification
    'cinemas:read',
    'cinema_groups:read',
    'countries:read',
    'reference:read', 'reference:create', 'reference:update',
    'movies:read', 'movies:create', 'movies:update',
    'sessions:read', 'sessions:create', 'sessions:update',
    'export_clients:read',
  ],
  external: [
    // Only adding movies, movie editions, sessions for linked cinemas
    'cinemas:read',
    'cinema_groups:read',
    'countries:read',
    'reference:read',
    'movies:read', 'movies:create', 'movies:update',
    'sessions:read', 'sessions:create', 'sessions:update',
  ],
};

// Check if a role has a specific permission
export function hasPermission(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  return rolePermissions[role]?.includes(permission) ?? false;
}

// Check if a role has any of the specified permissions
export function hasAnyPermission(role: UserRole | undefined | null, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some(p => hasPermission(role, p));
}

// Check if a role has all of the specified permissions
export function hasAllPermissions(role: UserRole | undefined | null, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.every(p => hasPermission(role, p));
}

// Get all permissions for a role
export function getPermissions(role: UserRole | undefined | null): Permission[] {
  if (!role) return [];
  return rolePermissions[role] ?? [];
}

// Check if user can access admin section
export function canAccessAdmin(role: UserRole | undefined | null): boolean {
  return hasAnyPermission(role, ['users:read', 'reference:read', 'countries:read', 'cinema_groups:read', 'export_clients:read']);
}

// Check if user is admin (global or internal)
export function isAdmin(role: UserRole | undefined | null): boolean {
  return role === 'global_admin' || role === 'internal_admin';
}

// Check if user is global admin
export function isGlobalAdmin(role: UserRole | undefined | null): boolean {
  return role === 'global_admin';
}

// Role display names
export const roleDisplayNames: Record<UserRole, string> = {
  global_admin: 'Global Admin',
  internal_admin: 'Internal Admin',
  internal_user: 'Internal User',
  external: 'External User',
};

// Role descriptions
export const roleDescriptions: Record<UserRole, string> = {
  global_admin: 'Full access to all features including user management',
  internal_admin: 'Full access except user management',
  internal_user: 'Can create and edit movies/sessions, read-only for other data',
  external: 'Can manage sessions for assigned cinemas only',
};
