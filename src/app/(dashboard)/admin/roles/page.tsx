'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  Save,
  Users,
  Building2,
  Film,
  Calendar,
  Settings,
  Globe,
  Send,
  Layers,
} from 'lucide-react';
import type { UserRole } from '@/types/database.types';
import { roleDisplayNames, roleDescriptions } from '@/lib/permissions';

// Permission categories and their permissions
const permissionCategories = [
  {
    name: 'User Management',
    icon: Users,
    permissions: [
      { key: 'users:read', label: 'View users' },
      { key: 'users:create', label: 'Create users' },
      { key: 'users:update', label: 'Edit users' },
      { key: 'users:delete', label: 'Delete users' },
    ],
  },
  {
    name: 'Cinemas',
    icon: Building2,
    permissions: [
      { key: 'cinemas:read', label: 'View cinemas' },
      { key: 'cinemas:create', label: 'Create cinemas' },
      { key: 'cinemas:update', label: 'Edit cinemas' },
      { key: 'cinemas:delete', label: 'Delete cinemas' },
    ],
  },
  {
    name: 'Cinema Groups',
    icon: Layers,
    permissions: [
      { key: 'cinema_groups:read', label: 'View cinema groups' },
      { key: 'cinema_groups:create', label: 'Create cinema groups' },
      { key: 'cinema_groups:update', label: 'Edit cinema groups' },
      { key: 'cinema_groups:delete', label: 'Delete cinema groups' },
    ],
  },
  {
    name: 'Countries',
    icon: Globe,
    permissions: [
      { key: 'countries:read', label: 'View countries' },
      { key: 'countries:create', label: 'Create countries' },
      { key: 'countries:update', label: 'Edit countries' },
      { key: 'countries:delete', label: 'Delete countries' },
    ],
  },
  {
    name: 'Reference Data',
    icon: Settings,
    description: 'Formats, Technologies, Languages, Genres, Age Ratings, Tags',
    permissions: [
      { key: 'reference:read', label: 'View reference data' },
      { key: 'reference:create', label: 'Create reference data' },
      { key: 'reference:update', label: 'Edit reference data' },
      { key: 'reference:delete', label: 'Delete reference data' },
    ],
  },
  {
    name: 'Movies',
    icon: Film,
    permissions: [
      { key: 'movies:read', label: 'View movies' },
      { key: 'movies:create', label: 'Create movies' },
      { key: 'movies:update', label: 'Edit movies' },
      { key: 'movies:delete', label: 'Delete movies' },
    ],
  },
  {
    name: 'Sessions',
    icon: Calendar,
    permissions: [
      { key: 'sessions:read', label: 'View sessions' },
      { key: 'sessions:create', label: 'Create sessions' },
      { key: 'sessions:update', label: 'Edit sessions' },
      { key: 'sessions:delete', label: 'Delete sessions' },
    ],
  },
  {
    name: 'Export Clients',
    icon: Send,
    permissions: [
      { key: 'export_clients:read', label: 'View export clients' },
      { key: 'export_clients:create', label: 'Create export clients' },
      { key: 'export_clients:update', label: 'Edit export clients' },
      { key: 'export_clients:delete', label: 'Delete export clients' },
    ],
  },
];

// Default role permissions (from permissions.ts)
const defaultRolePermissions: Record<UserRole, string[]> = {
  global_admin: [
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
    'cinemas:read', 'cinemas:create', 'cinemas:update', 'cinemas:delete',
    'cinema_groups:read', 'cinema_groups:create', 'cinema_groups:update', 'cinema_groups:delete',
    'countries:read', 'countries:create', 'countries:update', 'countries:delete',
    'reference:read', 'reference:create', 'reference:update', 'reference:delete',
    'movies:read', 'movies:create', 'movies:update', 'movies:delete',
    'sessions:read', 'sessions:create', 'sessions:update', 'sessions:delete',
    'export_clients:read', 'export_clients:create', 'export_clients:update', 'export_clients:delete',
  ],
  internal_user: [
    'cinemas:read',
    'cinema_groups:read',
    'countries:read',
    'reference:read', 'reference:create', 'reference:update',
    'movies:read', 'movies:create', 'movies:update',
    'sessions:read', 'sessions:create', 'sessions:update',
    'export_clients:read',
  ],
  external: [
    'cinemas:read',
    'cinema_groups:read',
    'countries:read',
    'reference:read',
    'movies:read', 'movies:create', 'movies:update',
    'sessions:read', 'sessions:create', 'sessions:update',
  ],
};

const roles: UserRole[] = ['global_admin', 'internal_admin', 'internal_user', 'external'];

export default function RolesPage() {
  const { isGlobalAdmin } = useUser();
  const supabase = createClient();

  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, string[]>>(defaultRolePermissions);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load saved permissions from database
  useEffect(() => {
    async function loadPermissions() {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*');

      if (data && data.length > 0) {
        const loaded: Record<string, string[]> = {};
        data.forEach((row: { role: string; permissions: string[] }) => {
          loaded[row.role] = row.permissions;
        });
        setRolePermissions({ ...defaultRolePermissions, ...loaded } as Record<UserRole, string[]>);
      }
    }

    loadPermissions();
  }, [supabase]);

  // Toggle a permission for a role
  function togglePermission(role: UserRole, permission: string) {
    // Don't allow modifying global_admin permissions
    if (role === 'global_admin') return;

    setRolePermissions(prev => {
      const current = prev[role] || [];
      const updated = current.includes(permission)
        ? current.filter(p => p !== permission)
        : [...current, permission];
      return { ...prev, [role]: updated };
    });
  }

  // Save permissions to database
  async function savePermissions() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Upsert permissions for each role (except global_admin)
      for (const role of roles) {
        if (role === 'global_admin') continue;

        const { error: upsertError } = await supabase
          .from('role_permissions')
          .upsert({
            role,
            permissions: rolePermissions[role],
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'role',
          });

        if (upsertError) throw upsertError;
      }

      setSuccess('Permissions saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  }

  // Reset to defaults
  function resetToDefaults() {
    setRolePermissions(defaultRolePermissions);
  }

  // Check if role has permission
  function hasPermission(role: UserRole, permission: string): boolean {
    return rolePermissions[role]?.includes(permission) ?? false;
  }

  // Get role color
  function getRoleColor(role: UserRole): string {
    switch (role) {
      case 'global_admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'internal_admin': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'internal_user': return 'bg-green-100 text-green-800 border-green-200';
      case 'external': return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  }

  if (!isGlobalAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900">Access Denied</h2>
        <p className="text-slate-500 mt-2">You don't have permission to access this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Role Management</h1>
          <p className="text-sm text-slate-500 mt-1">Configure permissions for each user role</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            Reset to Defaults
          </Button>
          <Button onClick={savePermissions} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Role Cards */}
      <div className="grid grid-cols-4 gap-4">
        {roles.map(role => (
          <div key={role} className={`rounded-lg border p-4 ${getRoleColor(role)}`}>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-5 w-5" />
              <span className="font-semibold">{roleDisplayNames[role]}</span>
            </div>
            <p className="text-xs opacity-75">{roleDescriptions[role]}</p>
            <div className="mt-2 text-xs">
              {rolePermissions[role]?.length || 0} permissions
            </div>
          </div>
        ))}
      </div>

      {/* Permission Matrix */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left py-3 px-4 font-medium text-slate-600 w-64">Permission</th>
                {roles.map(role => (
                  <th key={role} className="text-center py-3 px-4 font-medium text-slate-600 w-32">
                    <div className="flex flex-col items-center gap-1">
                      <Badge variant="outline" className={getRoleColor(role)}>
                        {roleDisplayNames[role].split(' ')[0]}
                      </Badge>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionCategories.map(category => (
                <>
                  {/* Category Header */}
                  <tr key={category.name} className="bg-slate-50/50">
                    <td colSpan={5} className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <category.icon className="h-4 w-4 text-slate-500" />
                        <span className="font-semibold text-slate-700">{category.name}</span>
                        {category.description && (
                          <span className="text-xs text-slate-400">({category.description})</span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {/* Permission Rows */}
                  {category.permissions.map(permission => (
                    <tr key={permission.key} className="border-b border-slate-100 hover:bg-slate-50/50">
                      <td className="py-2 px-4 pl-10 text-sm text-slate-600">
                        {permission.label}
                      </td>
                      {roles.map(role => {
                        const checked = hasPermission(role, permission.key);
                        const disabled = role === 'global_admin';
                        return (
                          <td key={`${role}-${permission.key}`} className="py-2 px-4 text-center">
                            <label className="inline-flex items-center justify-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePermission(role, permission.key)}
                                disabled={disabled}
                                className={`h-5 w-5 rounded border-slate-300 transition-colors ${
                                  disabled
                                    ? 'cursor-not-allowed opacity-50'
                                    : 'cursor-pointer hover:border-slate-400'
                                } ${
                                  checked
                                    ? 'bg-slate-900 border-slate-900 text-white'
                                    : 'bg-white'
                                }`}
                              />
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="text-sm text-slate-500 flex items-center gap-4">
        <span className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Global Admin permissions cannot be modified
        </span>
        <span className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Changes are applied immediately after saving
        </span>
      </div>
    </div>
  );
}
