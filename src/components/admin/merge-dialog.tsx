'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Merge, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

interface MergeItem {
  id: string;
  name: string;
  code?: string;
}

interface MergeConfig {
  // The table being merged (e.g., 'genres', 'formats')
  tableName: string;
  // Junction tables that reference this table - array of { table, column }
  junctionTables?: Array<{ table: string; column: string }>;
  // Direct foreign key references - array of { table, column }
  foreignKeys?: Array<{ table: string; column: string }>;
}

interface MergeDialogProps<T extends MergeItem> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: T[];
  selectedIds: string[];
  config: MergeConfig;
  onMergeComplete: () => void;
  displayField?: keyof T;
}

export function MergeDialog<T extends MergeItem>({
  open,
  onOpenChange,
  items,
  selectedIds,
  config,
  onMergeComplete,
  displayField = 'name',
}: MergeDialogProps<T>) {
  const supabase = createClient();
  const [masterId, setMasterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedItems = items.filter((item) => selectedIds.includes(item.id));
  const masterItem = selectedItems.find((item) => item.id === masterId);
  const itemsToMerge = selectedItems.filter((item) => item.id !== masterId);

  async function handleMerge() {
    if (!masterId || itemsToMerge.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const idsToMerge = itemsToMerge.map((item) => item.id);

      // Update junction tables
      if (config.junctionTables) {
        for (const junction of config.junctionTables) {
          // First, delete any duplicate entries that would violate unique constraints
          // by checking if the master already has the same related item
          const { data: existingMasterRefs } = await supabase
            .from(junction.table)
            .select('*')
            .eq(junction.column, masterId);

          if (existingMasterRefs && existingMasterRefs.length > 0) {
            // Get the other column name (the one that's not the reference column)
            const otherColumns = Object.keys(existingMasterRefs[0]).filter(
              (col) => col !== junction.column && col !== 'id' && col !== 'created_at'
            );

            for (const otherCol of otherColumns) {
              const masterValues = existingMasterRefs.map((r: Record<string, unknown>) => r[otherCol]);

              // Delete duplicates from items being merged
              await supabase
                .from(junction.table)
                .delete()
                .in(junction.column, idsToMerge)
                .in(otherCol, masterValues);
            }
          }

          // Now update remaining references to point to master
          await supabase
            .from(junction.table)
            .update({ [junction.column]: masterId })
            .in(junction.column, idsToMerge);
        }
      }

      // Update direct foreign key references
      if (config.foreignKeys) {
        for (const fk of config.foreignKeys) {
          await supabase
            .from(fk.table)
            .update({ [fk.column]: masterId })
            .in(fk.column, idsToMerge);
        }
      }

      // Delete the merged items
      const { error: deleteError } = await supabase
        .from(config.tableName)
        .delete()
        .in('id', idsToMerge);

      if (deleteError) throw deleteError;

      setSuccess(
        `Successfully merged ${itemsToMerge.length} items into "${masterItem?.[displayField]}"`
      );

      setTimeout(() => {
        onOpenChange(false);
        onMergeComplete();
        setSuccess(null);
        setMasterId(null);
      }, 1500);
    } catch (err: any) {
      console.error('Merge error:', err);
      setError(err.message || 'Failed to merge items');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5" />
            Merge Items
          </DialogTitle>
          <DialogDescription>
            Select a master item. All references to other selected items will be updated to point
            to the master, then duplicates will be deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
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

          {selectedItems.length < 2 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select at least 2 items to merge.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">
                  Select the master item (this will be kept):
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedItems.map((item) => (
                    <label
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        masterId === item.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="master"
                        value={item.id}
                        checked={masterId === item.id}
                        onChange={() => setMasterId(item.id)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <div className="flex-1">
                        <span className="font-medium">{String(item[displayField])}</span>
                        {item.code && (
                          <Badge variant="outline" className="ml-2">
                            {item.code}
                          </Badge>
                        )}
                      </div>
                      {masterId === item.id && (
                        <Badge variant="default">Master</Badge>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {masterId && itemsToMerge.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-slate-700">Merge preview:</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {itemsToMerge.map((item, i) => (
                      <span key={item.id} className="flex items-center gap-1">
                        <Badge variant="secondary">{String(item[displayField])}</Badge>
                        {i < itemsToMerge.length - 1 && (
                          <span className="text-slate-400">,</span>
                        )}
                      </span>
                    ))}
                    <ArrowRight className="h-4 w-4 text-slate-400 mx-1" />
                    <Badge variant="default">{String(masterItem?.[displayField])}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {itemsToMerge.length} item(s) will be merged and deleted.
                    All references will be updated to point to the master.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setMasterId(null);
              setError(null);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMerge}
            disabled={loading || !masterId || itemsToMerge.length === 0}
          >
            {loading ? 'Merging...' : `Merge ${itemsToMerge.length} Items`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Predefined merge configurations for common reference tables
export const mergeConfigs: Record<string, MergeConfig> = {
  genres: {
    tableName: 'genres',
    junctionTables: [{ table: 'movie_l0_genres', column: 'genre_id' }],
    foreignKeys: [{ table: 'genres', column: 'parent_id' }],
  },
  age_ratings: {
    tableName: 'age_ratings',
    foreignKeys: [{ table: 'movies_l1', column: 'age_rating_id' }],
  },
  formats: {
    tableName: 'formats',
    foreignKeys: [{ table: 'movies_l2', column: 'format_id' }],
  },
  technologies: {
    tableName: 'technologies',
    foreignKeys: [{ table: 'movies_l2', column: 'technology_id' }],
  },
  languages: {
    tableName: 'languages',
    junctionTables: [{ table: 'movie_l2_subtitles', column: 'language_id' }],
    foreignKeys: [
      { table: 'movies_l1', column: 'language_id' },
      { table: 'movies_l2', column: 'audio_language_id' },
      { table: 'movies_l2', column: 'subtitle_language_id' },
      { table: 'movies_l2', column: 'subtitle_language_2_id' },
    ],
  },
  countries: {
    tableName: 'countries',
    junctionTables: [{ table: 'movie_l0_countries', column: 'country_id' }],
    foreignKeys: [
      { table: 'cinemas', column: 'country_id' },
      { table: 'cinema_groups', column: 'country_id' },
      { table: 'people', column: 'country_id' },
      { table: 'movie_l0_production_companies', column: 'company_country_id' },
    ],
  },
  cinema_tags: {
    tableName: 'cinema_tags',
    junctionTables: [{ table: 'cinema_cinema_tags', column: 'tag_id' }],
  },
  movie_tags: {
    tableName: 'movie_tags',
    junctionTables: [{ table: 'movie_l0_movie_tags', column: 'tag_id' }],
  },
  session_tags: {
    tableName: 'session_tags',
    junctionTables: [{ table: 'session_session_tags', column: 'tag_id' }],
  },
};
