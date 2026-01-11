'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: string;
  header: string | React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

export interface BulkAction<T> {
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'outline';
  onClick: (selectedItems: T[]) => void | Promise<void>;
  confirmMessage?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  bulkActions?: BulkAction<T>[];
  emptyMessage?: string;
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  data,
  columns,
  getRowId,
  bulkActions = [],
  emptyMessage = 'No data found',
  isLoading = false,
  onRowClick,
}: DataTableProps<T>) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = React.useState<number | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);

  // Reset selection when data changes
  React.useEffect(() => {
    setSelectedIds(new Set());
    setLastClickedIndex(null);
  }, [data]);

  const allSelected = data.length > 0 && selectedIds.size === data.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < data.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(data.map(getRowId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (
    row: T,
    index: number,
    event: React.MouseEvent | React.KeyboardEvent
  ) => {
    const id = getRowId(row);
    const newSelected = new Set(selectedIds);

    // Shift-click for range selection
    if (event.shiftKey && lastClickedIndex !== null) {
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);

      // Determine if we're selecting or deselecting based on the clicked row
      const shouldSelect = !selectedIds.has(id);

      for (let i = start; i <= end; i++) {
        const rowId = getRowId(data[i]);
        if (shouldSelect) {
          newSelected.add(rowId);
        } else {
          newSelected.delete(rowId);
        }
      }
    } else {
      // Regular click - toggle single row
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
    }

    setSelectedIds(newSelected);
    setLastClickedIndex(index);
  };

  const handleBulkAction = async (action: BulkAction<T>) => {
    const selectedItems = data.filter((row) => selectedIds.has(getRowId(row)));

    if (action.confirmMessage) {
      const confirmed = window.confirm(action.confirmMessage);
      if (!confirmed) return;
    }

    setActionLoading(true);
    try {
      await action.onClick(selectedItems);
      setSelectedIds(new Set());
    } finally {
      setActionLoading(false);
    }
  };

  const selectedItems = data.filter((row) => selectedIds.has(getRowId(row)));

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {bulkActions.length > 0 && selectedIds.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg border">
          <span className="text-sm font-medium">
            {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            {bulkActions.length <= 3 ? (
              // Show buttons directly if 3 or fewer actions
              bulkActions.map((action, i) => (
                <Button
                  key={i}
                  variant={action.variant || 'outline'}
                  size="sm"
                  onClick={() => handleBulkAction(action)}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    action.icon && <span className="mr-2">{action.icon}</span>
                  )}
                  {action.label}
                </Button>
              ))
            ) : (
              // Use dropdown for more than 3 actions
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={actionLoading}>
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Actions
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {bulkActions.map((action, i) => (
                    <React.Fragment key={i}>
                      {action.variant === 'destructive' && i > 0 && (
                        <DropdownMenuSeparator />
                      )}
                      <DropdownMenuItem
                        onClick={() => handleBulkAction(action)}
                        className={cn(
                          action.variant === 'destructive' && 'text-destructive'
                        )}
                      >
                        {action.icon && <span className="mr-2">{action.icon}</span>}
                        {action.label}
                      </DropdownMenuItem>
                    </React.Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto"
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {bulkActions.length > 0 && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    data-state={someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked'}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (bulkActions.length > 0 ? 1 : 0)}
                  className="text-center py-8"
                >
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (bulkActions.length > 0 ? 1 : 0)}
                  className="text-center py-8 text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => {
                const id = getRowId(row);
                const isSelected = selectedIds.has(id);

                return (
                  <TableRow
                    key={id}
                    className={cn(
                      isSelected && 'bg-muted/50',
                      onRowClick && 'cursor-pointer hover:bg-muted/30'
                    )}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {bulkActions.length > 0 && (
                      <TableCell
                        className="w-12"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => {}}
                          onClick={(e) => handleSelectRow(row, index, e)}
                          aria-label={`Select row ${index + 1}`}
                        />
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell key={column.key} className={column.className}>
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Selection count footer */}
      {data.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {selectedIds.size > 0
            ? `${selectedIds.size} of ${data.length} row(s) selected`
            : `${data.length} row(s) total`}
        </div>
      )}
    </div>
  );
}
