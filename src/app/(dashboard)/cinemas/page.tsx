'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable, Column, BulkAction } from '@/components/ui/data-table';
import { Plus, Building2, MapPin, Eye, Pencil, Check, X, Trash2, Archive, AlertTriangle, Filter } from 'lucide-react';

interface Cinema {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  screen_count: number;
  is_active: boolean;
  parser_id: string | null;
  cinema_group: { id: string; name: string; parser_id: string | null } | null;
  country: { code: string; name: string } | null;
  parser: { id: string; name: string; slug: string } | null;
}

// Normalize name for comparison (remove common suffixes, lowercase, trim)
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+(cinema|kino|theater|theatre|cinemax|multiplex|imax)s?$/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export default function CinemasPage() {
  const router = useRouter();
  const supabase = createClient();
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  useEffect(() => {
    fetchCinemas();
  }, []);

  async function fetchCinemas() {
    setLoading(true);
    const { data, error } = await supabase
      .from('cinemas')
      .select(`
        id,
        name,
        slug,
        city,
        screen_count,
        is_active,
        parser_id,
        cinema_group:cinema_groups(id, name, parser_id),
        country:countries(code, name),
        parser:parsers(id, name, slug)
      `)
      .order('name');

    if (data) {
      // Transform data to handle array relations
      const transformed = data.map((c: any) => ({
        ...c,
        cinema_group: Array.isArray(c.cinema_group) ? c.cinema_group[0] : c.cinema_group,
        country: Array.isArray(c.country) ? c.country[0] : c.country,
        parser: Array.isArray(c.parser) ? c.parser[0] : c.parser,
      }));
      setCinemas(transformed);
    }
    setLoading(false);
  }

  // Find potential duplicates - cinemas with same normalized name
  const duplicateGroups = useMemo(() => {
    const nameMap = new Map<string, Cinema[]>();
    cinemas.forEach((cinema) => {
      const normalized = normalizeName(cinema.name);
      if (!nameMap.has(normalized)) {
        nameMap.set(normalized, []);
      }
      nameMap.get(normalized)!.push(cinema);
    });

    // Only keep groups with more than one cinema
    const groups: Map<string, Cinema[]> = new Map();
    nameMap.forEach((items, key) => {
      if (items.length > 1) {
        groups.set(key, items);
      }
    });
    return groups;
  }, [cinemas]);

  // Set of duplicate cinema IDs for quick lookup
  const duplicateIds = useMemo(() => {
    const ids = new Set<string>();
    duplicateGroups.forEach((items) => {
      items.forEach((cinema) => ids.add(cinema.id));
    });
    return ids;
  }, [duplicateGroups]);

  // Filtered data based on duplicate toggle
  const filteredCinemas = useMemo(() => {
    if (!showDuplicatesOnly) return cinemas;
    return cinemas.filter((cinema) => duplicateIds.has(cinema.id));
  }, [cinemas, showDuplicatesOnly, duplicateIds]);

  // Get effective parser (from cinema or fallback to group)
  const getEffectiveParser = (cinema: Cinema) => {
    if (cinema.parser) return cinema.parser;
    if (cinema.cinema_group?.parser_id) {
      // Parser is inherited from group but we don't have the name
      return { inherited: true, groupName: cinema.cinema_group.name };
    }
    return null;
  };

  const columns: Column<Cinema>[] = [
    {
      key: 'name',
      header: 'Cinema',
      cell: (cinema) => {
        const isDuplicate = duplicateIds.has(cinema.id);
        return (
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded flex items-center justify-center ${isDuplicate ? 'bg-amber-100' : 'bg-muted'}`}>
              {isDuplicate ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : (
                <Building2 className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium">{cinema.name}</p>
              <p className="text-xs text-muted-foreground">{cinema.slug}</p>
              {isDuplicate && (
                <p className="text-xs text-amber-600">Potential duplicate</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'group',
      header: 'Group',
      cell: (cinema) =>
        cinema.cinema_group ? (
          <Badge variant="outline">{cinema.cinema_group.name}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: 'location',
      header: 'Location',
      cell: (cinema) => (
        <div className="flex items-center gap-1 text-sm">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          {cinema.city || '-'}
          {cinema.country && (
            <span className="text-muted-foreground">({cinema.country.code})</span>
          )}
        </div>
      ),
    },
    {
      key: 'screens',
      header: 'Screens',
      cell: (cinema) => cinema.screen_count || 0,
    },
    {
      key: 'parser',
      header: 'Parser',
      cell: (cinema) => {
        const effectiveParser = getEffectiveParser(cinema);
        if (!effectiveParser) {
          return <span className="text-muted-foreground">-</span>;
        }
        if ('inherited' in effectiveParser) {
          return (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              From {effectiveParser.groupName}
            </Badge>
          );
        }
        return <Badge variant="secondary">{effectiveParser.name}</Badge>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      cell: (cinema) =>
        cinema.is_active ? (
          <span className="flex items-center text-green-600">
            <Check className="h-4 w-4 mr-1" />
            Active
          </span>
        ) : (
          <span className="flex items-center text-muted-foreground">
            <X className="h-4 w-4 mr-1" />
            Inactive
          </span>
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-24',
      cell: (cinema) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Link href={`/cinemas/${cinema.id}`}>
            <Button variant="ghost" size="icon">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/cinemas/${cinema.id}/edit`}>
            <Button variant="ghost" size="icon">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      ),
    },
  ];

  const bulkActions: BulkAction<Cinema>[] = [
    {
      label: 'Activate',
      icon: <Check className="h-4 w-4" />,
      onClick: async (items) => {
        const ids = items.map((c) => c.id);
        await supabase.from('cinemas').update({ is_active: true }).in('id', ids);
        fetchCinemas();
      },
    },
    {
      label: 'Deactivate',
      icon: <Archive className="h-4 w-4" />,
      onClick: async (items) => {
        const ids = items.map((c) => c.id);
        await supabase.from('cinemas').update({ is_active: false }).in('id', ids);
        fetchCinemas();
      },
    },
    {
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      confirmMessage: 'Are you sure you want to delete the selected cinemas? This action cannot be undone.',
      onClick: async (items) => {
        const ids = items.map((c) => c.id);
        await supabase.from('cinemas').delete().in('id', ids);
        fetchCinemas();
      },
    },
  ];

  const duplicateCount = duplicateIds.size;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cinemas</h1>
          <p className="text-muted-foreground">
            Manage cinema locations ({cinemas.length} total)
            {duplicateCount > 0 && (
              <span className="text-amber-600 ml-2">
                • {duplicateCount} potential duplicates found
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {duplicateCount > 0 && (
            <Button
              variant={showDuplicatesOnly ? 'default' : 'outline'}
              onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
            >
              <Filter className="mr-2 h-4 w-4" />
              {showDuplicatesOnly ? 'Show All' : 'Show Duplicates'}
            </Button>
          )}
          <Link href="/cinemas/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Cinema
            </Button>
          </Link>
        </div>
      </div>

      {duplicateCount > 0 && showDuplicatesOnly && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-sm">
                <strong>{duplicateCount} potential duplicate cinemas found.</strong> Review and select duplicates to delete them using bulk actions.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <DataTable
            data={filteredCinemas}
            columns={columns}
            getRowId={(cinema) => cinema.id}
            bulkActions={bulkActions}
            emptyMessage={showDuplicatesOnly ? "No duplicate cinemas found" : "No cinemas found"}
            isLoading={loading}
            onRowClick={(cinema) => router.push(`/cinemas/${cinema.id}`)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
