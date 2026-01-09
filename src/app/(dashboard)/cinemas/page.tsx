import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Building2, MapPin, Eye, Pencil, Check, X } from 'lucide-react';

async function getCinemas() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('cinemas')
    .select(
      `
      id,
      name,
      slug,
      city,
      screen_count,
      is_active,
      parser_type,
      cinema_group:cinema_groups(id, name),
      country:countries(code, name)
    `
    )
    .order('name');

  return data || [];
}

export default async function CinemasPage() {
  const cinemas = await getCinemas();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cinemas</h1>
          <p className="text-muted-foreground">
            Manage cinema locations ({cinemas.length} total)
          </p>
        </div>
        <Link href="/cinemas/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Cinema
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cinema</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Screens</TableHead>
                <TableHead>Parser</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cinemas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No cinemas found
                  </TableCell>
                </TableRow>
              ) : (
                cinemas.map((cinema: any) => (
                  <TableRow key={cinema.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{cinema.name}</p>
                          <p className="text-xs text-muted-foreground">{cinema.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {cinema.cinema_group ? (
                        <Badge variant="outline">{cinema.cinema_group.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {cinema.city || '-'}
                        {cinema.country && (
                          <span className="text-muted-foreground">({cinema.country.code})</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{cinema.screen_count}</TableCell>
                    <TableCell>
                      {cinema.parser_type ? (
                        <Badge variant="secondary">{cinema.parser_type}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {cinema.is_active ? (
                        <span className="flex items-center text-green-600">
                          <Check className="h-4 w-4 mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center text-muted-foreground">
                          <X className="h-4 w-4 mr-1" />
                          Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
