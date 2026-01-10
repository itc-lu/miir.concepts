'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/contexts/user-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Plus, MoreHorizontal, Pencil, Trash2, Search, Send, AlertCircle, CheckCircle, Mail, FileCode,
} from 'lucide-react';
import type { ExportClient, ExportTemplate } from '@/types/database.types';

export default function ExportClientsPage() {
  const { hasPermission } = useUser();
  const supabase = createClient();

  const canCreate = hasPermission('export_clients:create');
  const canUpdate = hasPermission('export_clients:update');
  const canDelete = hasPermission('export_clients:delete');

  const [items, setItems] = useState<(ExportClient & { templates?: ExportTemplate[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ExportClient | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    contact_email: '',
    contact_name: '',
    is_active: true,
  });

  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
    format: 'xml' as 'xml' | 'json' | 'csv',
    template_content: '',
    is_active: true,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  async function fetchData() {
    setLoading(true);
    const { data } = await supabase
      .from('export_clients')
      .select('*, templates:export_templates(*)')
      .order('name');
    if (data) setItems(data);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.contact_email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  // Generate slug from name
  function generateSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      const { error } = await supabase.from('export_clients').insert({
        name: formData.name,
        slug: formData.slug || generateSlug(formData.name),
        contact_email: formData.contact_email || null,
        contact_name: formData.contact_name || null,
        is_active: formData.is_active,
      });

      if (error) throw error;

      setFormSuccess('Export client created successfully');
      fetchData();
      setTimeout(() => {
        setCreateDialogOpen(false);
        setFormSuccess(null);
        resetForm();
      }, 1500);
    } catch (error: any) {
      setFormError(error.message || 'Failed to create export client');
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
      const { error } = await supabase.from('export_clients').update({
        name: formData.name,
        slug: formData.slug,
        contact_email: formData.contact_email || null,
        contact_name: formData.contact_name || null,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedItem.id);

      if (error) throw error;

      setFormSuccess('Export client updated successfully');
      fetchData();
      setTimeout(() => {
        setEditDialogOpen(false);
        setFormSuccess(null);
      }, 1500);
    } catch (error: any) {
      setFormError(error.message || 'Failed to update export client');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete() {
    if (!selectedItem) return;
    setFormLoading(true);
    try {
      const { error } = await supabase.from('export_clients').delete().eq('id', selectedItem.id);
      if (error) throw error;
      fetchData();
      setDeleteDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to delete:', error);
    } finally {
      setFormLoading(false);
    }
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;

    setFormError(null);
    setFormLoading(true);

    try {
      if (selectedTemplate) {
        // Update existing template
        const { error } = await supabase.from('export_templates').update({
          name: templateFormData.name,
          description: templateFormData.description || null,
          format: templateFormData.format,
          template_content: templateFormData.template_content,
          is_active: templateFormData.is_active,
          updated_at: new Date().toISOString(),
        }).eq('id', selectedTemplate.id);

        if (error) throw error;
      } else {
        // Create new template
        const { error } = await supabase.from('export_templates').insert({
          client_id: selectedItem.id,
          name: templateFormData.name,
          description: templateFormData.description || null,
          format: templateFormData.format,
          template_content: templateFormData.template_content,
          config: {},
          is_active: templateFormData.is_active,
        });

        if (error) throw error;
      }

      setFormSuccess('Template saved successfully');
      fetchData();
      setTimeout(() => {
        setTemplateDialogOpen(false);
        setFormSuccess(null);
      }, 1500);
    } catch (error: any) {
      setFormError(error.message || 'Failed to save template');
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeleteTemplate(template: ExportTemplate) {
    try {
      const { error } = await supabase.from('export_templates').delete().eq('id', template.id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      console.error('Failed to delete template:', error);
    }
  }

  function resetForm() {
    setFormData({ name: '', slug: '', contact_email: '', contact_name: '', is_active: true });
  }

  function resetTemplateForm() {
    setTemplateFormData({ name: '', description: '', format: 'xml', template_content: '', is_active: true });
    setSelectedTemplate(null);
  }

  function openEditDialog(item: ExportClient) {
    setSelectedItem(item);
    setFormData({
      name: item.name,
      slug: item.slug,
      contact_email: item.contact_email || '',
      contact_name: item.contact_name || '',
      is_active: item.is_active,
    });
    setFormError(null);
    setFormSuccess(null);
    setEditDialogOpen(true);
  }

  function openTemplateDialog(client: ExportClient, template?: ExportTemplate) {
    setSelectedItem(client);
    if (template) {
      setSelectedTemplate(template);
      setTemplateFormData({
        name: template.name,
        description: template.description || '',
        format: template.format,
        template_content: template.template_content,
        is_active: template.is_active,
      });
    } else {
      resetTemplateForm();
    }
    setFormError(null);
    setFormSuccess(null);
    setTemplateDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Export Clients</h1>
          <p className="text-sm text-slate-500 mt-1">Manage export clients and their templates</p>
        </div>
        {canCreate && (
          <Button onClick={() => { resetForm(); setFormError(null); setFormSuccess(null); setCreateDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search export clients..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Templates</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><div className="text-slate-500">Loading...</div></TableCell></TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8"><Send className="h-8 w-8 text-slate-300 mx-auto mb-2" /><div className="text-slate-500">No export clients found</div></TableCell></TableRow>
            ) : (
              filteredItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-slate-900">{item.name}</TableCell>
                  <TableCell><Badge variant="outline">{item.slug}</Badge></TableCell>
                  <TableCell>
                    {item.contact_email ? (
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-slate-400" />
                        <span className="text-slate-600">{item.contact_name ? `${item.contact_name} <${item.contact_email}>` : item.contact_email}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{item.templates?.length || 0}</Badge>
                      {canCreate && (
                        <Button variant="ghost" size="sm" onClick={() => openTemplateDialog(item)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={item.is_active ? 'default' : 'secondary'}>{item.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell>
                    {(canUpdate || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {canUpdate && <DropdownMenuItem onClick={() => openEditDialog(item)}><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>}
                          {canCreate && <DropdownMenuItem onClick={() => openTemplateDialog(item)}><FileCode className="h-4 w-4 mr-2" />Add Template</DropdownMenuItem>}
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

      {/* Templates Section */}
      {filteredItems.some(i => (i.templates?.length || 0) > 0) && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Templates by Client</h2>
          {filteredItems.filter(i => (i.templates?.length || 0) > 0).map(client => (
            <div key={client.id} className="bg-white rounded-lg border border-slate-200 p-4">
              <h3 className="font-medium text-slate-900 mb-3">{client.name}</h3>
              <div className="space-y-2">
                {client.templates?.map(template => (
                  <div key={template.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-md">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{template.format.toUpperCase()}</Badge>
                      <span className="font-medium text-sm">{template.name}</span>
                      {template.description && (
                        <span className="text-sm text-slate-500">{template.description}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={template.is_active ? 'default' : 'secondary'} className="text-xs">
                        {template.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {canUpdate && (
                        <Button variant="ghost" size="sm" onClick={() => openTemplateDialog(client, template)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteTemplate(template)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Client Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Add Export Client</DialogTitle>
            <DialogDescription>Create a new export client for data feeds.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{formError}</AlertDescription></Alert>}
              {formSuccess && <Alert><CheckCircle className="h-4 w-4" /><AlertDescription>{formSuccess}</AlertDescription></Alert>}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: generateSlug(e.target.value) })} required placeholder="e.g., RTL" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="auto-generated" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact Name</Label>
                <Input id="contact_name" value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <Input id="contact_email" type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} />
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

      {/* Edit Client Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Edit Export Client</DialogTitle>
            <DialogDescription>Update export client information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{formError}</AlertDescription></Alert>}
              {formSuccess && <Alert><CheckCircle className="h-4 w-4" /><AlertDescription>{formSuccess}</AlertDescription></Alert>}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_name">Name *</Label>
                  <Input id="edit_name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_slug">Slug</Label>
                  <Input id="edit_slug" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_contact_name">Contact Name</Label>
                <Input id="edit_contact_name" value={formData.contact_name} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_contact_email">Contact Email</Label>
                <Input id="edit_contact_email" type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} />
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
            <DialogTitle>Delete Export Client</DialogTitle>
            <DialogDescription>Are you sure you want to delete "{selectedItem?.name}"? This will also delete all associated templates.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={formLoading}>{formLoading ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? 'Edit Template' : 'Add Template'}</DialogTitle>
            <DialogDescription>
              {selectedTemplate ? 'Update' : 'Create'} an export template for {selectedItem?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveTemplate}>
            <div className="space-y-4 py-4">
              {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{formError}</AlertDescription></Alert>}
              {formSuccess && <Alert><CheckCircle className="h-4 w-4" /><AlertDescription>{formSuccess}</AlertDescription></Alert>}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template_name">Name *</Label>
                  <Input id="template_name" value={templateFormData.name} onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })} required placeholder="e.g., Daily Feed" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template_format">Format *</Label>
                  <select
                    id="template_format"
                    value={templateFormData.format}
                    onChange={(e) => setTemplateFormData({ ...templateFormData, format: e.target.value as any })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="xml">XML</option>
                    <option value="json">JSON</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="template_description">Description</Label>
                <Input id="template_description" value={templateFormData.description} onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template_content">Template Content</Label>
                <textarea
                  id="template_content"
                  value={templateFormData.template_content}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, template_content: e.target.value })}
                  className="w-full h-40 px-3 py-2 rounded-md border border-input bg-background text-sm font-mono"
                  placeholder="Enter template content..."
                />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="template_is_active" checked={templateFormData.is_active} onChange={(e) => setTemplateFormData({ ...templateFormData, is_active: e.target.checked })} className="h-4 w-4 rounded border-slate-300" />
                <Label htmlFor="template_is_active" className="font-normal">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={formLoading}>{formLoading ? 'Saving...' : 'Save Template'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
