'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Key,
  Archive,
  ArchiveRestore,
  Search,
  Users,
  ShieldCheck,
  AlertCircle,
  CheckCircle,
  XCircle,
  Building2,
} from 'lucide-react';
import type { UserProfile, UserRole, Cinema, CinemaGroup } from '@/types/database.types';
import { roleDisplayNames, roleDescriptions } from '@/lib/permissions';

type UserWithPermissions = UserProfile & {
  cinema_permissions?: { cinema_id: string; cinema?: Cinema }[];
  cinema_group_permissions?: { cinema_group_id: string; cinema_group?: CinemaGroup }[];
};

export default function UsersPage() {
  const { isGlobalAdmin } = useUser();
  const supabase = createClient();

  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [cinemaGroups, setCinemaGroups] = useState<CinemaGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'external' as UserRole,
    phone: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Permission form states
  const [selectedCinemas, setSelectedCinemas] = useState<string[]>([]);
  const [selectedCinemaGroups, setSelectedCinemaGroups] = useState<string[]>([]);

  // Fetch users
  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  }

  // Fetch cinemas and groups
  async function fetchCinemasAndGroups() {
    const [cinemasRes, groupsRes] = await Promise.all([
      supabase.from('cinemas').select('*').eq('is_active', true).order('name'),
      supabase.from('cinema_groups').select('*').eq('is_active', true).order('name'),
    ]);

    if (cinemasRes.data) setCinemas(cinemasRes.data);
    if (groupsRes.data) setCinemaGroups(groupsRes.data);
  }

  useEffect(() => {
    fetchUsers();
    fetchCinemasAndGroups();
  }, []);

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesArchived = showArchived ? !user.is_active : user.is_active;
    return matchesSearch && matchesArchived;
  });

  // Create user
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setFormLoading(true);

    try {
      // Trim email and validate
      const email = formData.email.trim().toLowerCase();
      const password = formData.password;

      if (!email) {
        throw new Error('Email is required');
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      console.log('[User Create] Attempting signup for:', email);

      // Create user via Supabase Auth Admin API (requires service role)
      // For now, we'll use the signUp method and then update the profile
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: formData.full_name,
          },
        },
      });

      console.log('[User Create] Signup result:', {
        hasUser: !!authData?.user,
        hasSession: !!authData?.session,
        error: authError?.message,
        errorCode: authError?.status,
      });

      if (authError) {
        // Provide more helpful error messages
        if (authError.message.includes('already registered')) {
          throw new Error('A user with this email already exists');
        } else if (authError.message.includes('invalid')) {
          throw new Error('Invalid email format. Please check the email address.');
        } else if (authError.message.includes('password')) {
          throw new Error('Password does not meet requirements (minimum 6 characters)');
        }
        throw authError;
      }

      // Wait a bit for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update the profile with additional data
      if (authData.user) {
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            full_name: formData.full_name,
            role: formData.role,
            phone: formData.phone,
          })
          .eq('id', authData.user.id);

        if (updateError) throw updateError;
      }

      setFormSuccess('User created successfully. They will receive an email to confirm their account.');
      fetchUsers();

      // Reset form
      setFormData({
        email: '',
        password: '',
        full_name: '',
        role: 'external',
        phone: '',
      });

      setTimeout(() => {
        setCreateDialogOpen(false);
        setFormSuccess(null);
      }, 2000);
    } catch (error: any) {
      setFormError(error.message || 'Failed to create user');
    } finally {
      setFormLoading(false);
    }
  }

  // Update user
  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;

    setFormError(null);
    setFormLoading(true);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: formData.full_name,
          role: formData.role,
          phone: formData.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      setFormSuccess('User updated successfully');
      fetchUsers();

      setTimeout(() => {
        setEditDialogOpen(false);
        setFormSuccess(null);
      }, 1500);
    } catch (error: any) {
      setFormError(error.message || 'Failed to update user');
    } finally {
      setFormLoading(false);
    }
  }

  // Toggle archive status
  async function handleToggleArchive(user: UserProfile) {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_active: !user.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      fetchUsers();
    } catch (error: any) {
      console.error('Failed to toggle archive status:', error);
    }
  }

  // Delete user (soft delete - we just archive them)
  async function handleDeleteUser() {
    if (!selectedUser) return;

    setFormLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      fetchUsers();
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to delete user:', error);
    } finally {
      setFormLoading(false);
    }
  }

  // Reset password
  async function handleResetPassword() {
    if (!selectedUser) return;

    setFormError(null);
    setFormLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(selectedUser.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setFormSuccess('Password reset email sent successfully');

      setTimeout(() => {
        setResetPasswordDialogOpen(false);
        setFormSuccess(null);
      }, 2000);
    } catch (error: any) {
      setFormError(error.message || 'Failed to send reset email');
    } finally {
      setFormLoading(false);
    }
  }

  // Save cinema permissions
  async function handleSavePermissions() {
    if (!selectedUser) return;

    setFormLoading(true);
    try {
      // Delete existing permissions
      await supabase
        .from('user_cinema_permissions')
        .delete()
        .eq('user_id', selectedUser.id);

      await supabase
        .from('user_cinema_group_permissions')
        .delete()
        .eq('user_id', selectedUser.id);

      // Add new cinema permissions
      if (selectedCinemas.length > 0) {
        const cinemaPerms = selectedCinemas.map(cinema_id => ({
          user_id: selectedUser.id,
          cinema_id,
          can_edit: false,
          can_manage_sessions: true,
          can_view_sessions: true,
          can_create_sessions: true,
          can_edit_sessions: true,
          can_delete_sessions: false,
        }));

        await supabase.from('user_cinema_permissions').insert(cinemaPerms);
      }

      // Add new cinema group permissions
      if (selectedCinemaGroups.length > 0) {
        const groupPerms = selectedCinemaGroups.map(cinema_group_id => ({
          user_id: selectedUser.id,
          cinema_group_id,
          can_edit: false,
          can_manage_sessions: true,
          can_view_sessions: true,
          can_create_sessions: true,
          can_edit_sessions: true,
          can_delete_sessions: false,
        }));

        await supabase.from('user_cinema_group_permissions').insert(groupPerms);
      }

      fetchUsers();
      setPermissionsDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to save permissions:', error);
    } finally {
      setFormLoading(false);
    }
  }

  // Open edit dialog
  function openEditDialog(user: UserWithPermissions) {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      full_name: user.full_name || '',
      role: user.role,
      phone: user.phone || '',
    });
    setFormError(null);
    setFormSuccess(null);
    setEditDialogOpen(true);
  }

  // Open permissions dialog
  async function openPermissionsDialog(user: UserWithPermissions) {
    setSelectedUser(user);

    // Fetch existing permissions
    const [cinemaPerms, groupPerms] = await Promise.all([
      supabase.from('user_cinema_permissions').select('cinema_id').eq('user_id', user.id),
      supabase.from('user_cinema_group_permissions').select('cinema_group_id').eq('user_id', user.id),
    ]);

    setSelectedCinemas(cinemaPerms.data?.map(p => p.cinema_id) || []);
    setSelectedCinemaGroups(groupPerms.data?.map(p => p.cinema_group_id) || []);
    setPermissionsDialogOpen(true);
  }

  // Role badge color
  function getRoleBadgeVariant(role: UserRole): 'default' | 'secondary' | 'outline' | 'destructive' {
    switch (role) {
      case 'global_admin': return 'destructive';
      case 'internal_admin': return 'default';
      case 'internal_user': return 'secondary';
      default: return 'outline';
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
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500 mt-1">Manage user accounts and permissions</p>
        </div>
        <Button onClick={() => {
          setFormData({ email: '', password: '', full_name: '', role: 'external', phone: '' });
          setFormError(null);
          setFormSuccess(null);
          setCreateDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showArchived ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowArchived(!showArchived)}
        >
          <Archive className="h-4 w-4 mr-2" />
          {showArchived ? 'Showing Archived' : 'Show Archived'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {(['global_admin', 'internal_admin', 'internal_user', 'external'] as UserRole[]).map(role => {
          const count = users.filter(u => u.role === role && u.is_active).length;
          return (
            <div key={role} className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-500">{roleDisplayNames[role]}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 mt-2">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="text-slate-500">Loading...</div>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <div className="text-slate-500">No users found</div>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium text-slate-900">{user.full_name || 'No name'}</div>
                      <div className="text-sm text-slate-500">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {roleDisplayNames[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <XCircle className="h-4 w-4" />
                        Archived
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {user.last_login_at
                      ? new Date(user.last_login_at).toLocaleDateString()
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEditDialog(user)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {user.role === 'external' && (
                          <DropdownMenuItem onClick={() => openPermissionsDialog(user)}>
                            <Building2 className="h-4 w-4 mr-2" />
                            Cinema Access
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => {
                          setSelectedUser(user);
                          setFormError(null);
                          setFormSuccess(null);
                          setResetPasswordDialogOpen(true);
                        }}>
                          <Key className="h-4 w-4 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleArchive(user)}>
                          {user.is_active ? (
                            <>
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </>
                          ) : (
                            <>
                              <ArchiveRestore className="h-4 w-4 mr-2" />
                              Restore
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setSelectedUser(user);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Add a new user to the system. They will receive an email to set up their account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser}>
            <div className="space-y-4 py-4">
              {formError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              {formSuccess && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{formSuccess}</AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="text"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {(['external', 'internal_user', 'internal_admin', 'global_admin'] as UserRole[]).map(role => (
                    <option key={role} value={role}>
                      {roleDisplayNames[role]} - {roleDescriptions[role]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? 'Creating...' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and role.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser}>
            <div className="space-y-4 py-4">
              {formError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
              {formSuccess && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{formSuccess}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={formData.email} disabled className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_full_name">Full Name</Label>
                <Input
                  id="edit_full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_phone">Phone</Label>
                <Input
                  id="edit_phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_role">Role</Label>
                <select
                  id="edit_role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {(['external', 'internal_user', 'internal_admin', 'global_admin'] as UserRole[]).map(role => (
                    <option key={role} value={role}>
                      {roleDisplayNames[role]}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  {roleDescriptions[formData.role]}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Send a password reset email to {selectedUser?.email}?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {formError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            {formSuccess && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{formSuccess}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={formLoading}>
              {formLoading ? 'Sending...' : 'Send Reset Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.full_name || selectedUser?.email}?
              This will archive the user account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={formLoading}>
              {formLoading ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cinema Permissions Dialog */}
      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Cinema Access</DialogTitle>
            <DialogDescription>
              Configure which cinemas and cinema groups {selectedUser?.full_name || selectedUser?.email} can access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label>Cinema Groups</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                {cinemaGroups.map(group => (
                  <label key={group.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCinemaGroups.includes(group.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCinemaGroups([...selectedCinemaGroups, group.id]);
                        } else {
                          setSelectedCinemaGroups(selectedCinemaGroups.filter(id => id !== group.id));
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span className="text-sm">{group.name}</span>
                  </label>
                ))}
                {cinemaGroups.length === 0 && (
                  <p className="text-sm text-slate-500 p-2">No cinema groups available</p>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <Label>Individual Cinemas</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                {cinemas.map(cinema => (
                  <label key={cinema.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCinemas.includes(cinema.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCinemas([...selectedCinemas, cinema.id]);
                        } else {
                          setSelectedCinemas(selectedCinemas.filter(id => id !== cinema.id));
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    <span className="text-sm">{cinema.name}</span>
                  </label>
                ))}
                {cinemas.length === 0 && (
                  <p className="text-sm text-slate-500 p-2">No cinemas available</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPermissionsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} disabled={formLoading}>
              {formLoading ? 'Saving...' : 'Save Permissions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
