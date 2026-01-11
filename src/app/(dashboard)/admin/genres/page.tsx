'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Plus, MoreHorizontal, Pencil, Trash2, Search, Clapperboard, AlertCircle, CheckCircle, Merge,
} from 'lucide-react';
import { MergeDialog, mergeConfigs } from '@/components/admin/merge-dialog';
import type { Genre } from '@/types/database.types';

export default function GenresPage() {
  const { hasPermission } = useUser();
  const supabase = createClient();

  const canCreate = hasPermission('reference:create');
  const canUpdate = hasPermission('reference:update');
  const canDelete = hasPermission('reference:delete');

  const [items, setItems] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Genre | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    parent_id: '',
    display_order: 0,
    is_active: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase.from('genres').select('*').order('display_order');
    if (data) setItems(data);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Selection handlers
  const allSelected = filteredItems.length > 0 && filteredItems.every(item => selectedIds.includes(item.id));

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map(item => item.id));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  // Get parent genres for dropdown
  const parentGenres = items.filter(g => !g.parent_id);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      const { error } = await supabase.from('genres').insert({
        code: formData.code.toLowerCase(),
        name: formData.name,
        parent_id: formData.parent_id || null,
        display_order: formData.display_order,
        is_active: formData.is_active,
      });

      if (error) throw error;

      setFormSuccess('Genre created successfully');
      fetchData();
      setTimeout(() => {
        setCreateDialogOpen(false);
        setFormSuccess(null);
        resetForm();
      }, 1500);
    } catch (error: any) {
      setFormError(error.message || 'Failed to create genre');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;

    setFormError(null);
    setFormLoading(true);

    try {
      const { error } = await supabase.from('genres').update({
        code: formData.code.toLowerCase(),
        name: formData.name,
        parent_id: formData.parent_id || null,
        display_order: formData.display_order,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedItem.id);

      if (error) throw error;

      setFormSuccess('Genre updated successfully');
      fetchData();
      setTimeout(() => {
        setEditDialogOpen(false);
        setFormSuccess(null);
      }, 1500);
    } catch (error: any) {
      setFormError(error.message || 'Failed to update genre');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete() {
    if (!selectedItem) return;
    setFormLoading(true);
    try {
      const { error } = await supabase.from('genres').delete().eq('id', selectedItem.id);
      if (error) throw error;
      fetchData();
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to delete:', error);
    } finally {
      setFormLoading(false);
    }
  }

  function resetForm() {
    setFormData({ code: '', name: '', parent_id: '', display_order: 0, is_active: true });
  }

  function openEditDialog(item: Genre) {
    setSelectedItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      parent_id: item.parent_id || '',
      display_order: item.display_order,
      is_active: item.is_active,
    });
    setFormError(null);
    setFormSuccess(null);
    setEditDialogOpen(true);
  }

  // Get parent name
  function getParentName(parentId: string | null): string {
    if (!parentId) return '-';
    const parent = items.find(g => g.id === parentId);
    return parent?.name || '-';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Genres</h1>
          <p className="text-sm text-slate-500 mt-1">Manage movie genres and categories</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length >= 2 && canUpdate && (
            <Button variant="outline" onClick={() => setMergeDialogOpen(true)}>
              <Merge className="h-4 w-4 mr-2" />
              Merge ({selectedIds.length})
            </Button>
          )}
          {canCreate && (
            <Button onClick={() => { resetForm(); setFormError(null); setFormSuccess(null); setCreateDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Genre
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search genres..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        {selectedIds.length > 0 && (
          <span className="text-sm text-slate-500">{selectedIds.length} selected</span>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[50px]">Order</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><div className="text-slate-500">Loading...</div></TableCell></TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8"><Clapperboard className="h-8 w-8 text-slate-300 mx-auto mb-2" /><div className="text-slate-500">No genres found</div></TableCell></TableRow>
            ) : (
              filteredItems.map(item => (
                <TableRow key={item.id} className={selectedIds.includes(item.id) ? 'bg-blue-50' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                    />
                  </TableCell>
                  <TableCell><span className="text-slate-400">{item.display_order}</span></TableCell>
                  <TableCell><Badge variant="outline">{item.code}</Badge></TableCell>
                  <TableCell className="font-medium text-slate-900">{item.name}</TableCell>
                  <TableCell className="text-sm text-slate-500">{getParentName(item.parent_id)}</TableCell>
                  <TableCell><Badge variant={item.is_active ? 'default' : 'secondary'}>{item.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell>
                    {(canUpdate || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {canUpdate && <DropdownMenuItem onClick={() => openEditDialog(item)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}
                          {canDelete && <DropdownMenuItem className="text-red-600" onClick={() => { setSelectedItem(item); setDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Add Genre</DialogTitle>
            <DialogDescription>Create a new movie genre.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{formError}</AlertDescription></Alert>}
              {formSuccess && <Alert><CheckCircle className="h-4 w-4" /><AlertDescription>{formSuccess}</AlertDescription></Alert>}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required placeholder="e.g., action" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="order">Display Order</Label>
                  <Input id="order" type="number" value={formData.display_order} onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g., Action" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent">Parent Genre</Label>
                <select
                  id="parent"
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">No parent (top-level)</option>
                  {parentGenres.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                <Label htmlFor="is_active" className="font-normal">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={formLoading}>{formLoading ? 'Creating...' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Edit Genre</DialogTitle>
            <DialogDescription>Update genre information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{formError}</AlertDescription></Alert>}
              {formSuccess && <Alert><CheckCircle className="h-4 w-4" /><AlertDescription>{formSuccess}</AlertDescription></Alert>}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_code">Code *</Label>
                  <Input id="edit_code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_order">Display Order</Label>
                  <Input id="edit_order" type="number" value={formData.display_order} onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_name">Name *</Label>
                <Input id="edit_name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_parent">Parent Genre</Label>
                <select
                  id="edit_parent"
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">No parent (top-level)</option>
                  {parentGenres.filter(g => g.id !== selectedItem?.id).map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="edit_is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                <Label htmlFor="edit_is_active" className="font-normal">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={formLoading}>{formLoading ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Genre</DialogTitle>
            <DialogDescription>Are you sure you want to delete "{selectedItem?.name}"? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={formLoading}>{formLoading ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <MergeDialog
        open={mergeDialogOpen}
        onOpenChange={(open) => {
          setMergeDialogOpen(open);
          if (!open) setSelectedIds([]);
        }}
        items={items}
        selectedIds={selectedIds}
        config={mergeConfigs.genres}
        onMergeComplete={() => {
          setSelectedIds([]);
          fetchData();
        }}
      />
    </div>
  );
}
