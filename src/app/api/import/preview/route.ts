import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

interface CellData {
  value: string;
  type: 'header' | 'movie' | 'time' | 'data' | 'empty';
  row: number;
  col: number;
}

interface RowData {
  cells: CellData[];
  rowType: 'header' | 'data' | 'empty';
  movieName?: string;
  times?: { weekday: string; times: string[] }[];
}

interface SheetPreview {
  index: number;
  name: string;
  headers: string[];
  rows: RowData[];
  dateRange: { start: string; end: string } | null;
  detectedWeekdays: string[];
  filmColumnIndex: number;
  weekdayColumnStart: number;
}

// Weekday detection patterns
const WEEKDAY_PATTERNS: Record<string, string> = {
  // English
  'mon': 'Mon', 'monday': 'Mon',
  'tue': 'Tue', 'tues': 'Tue', 'tuesday': 'Tue',
  'wed': 'Wed', 'wednesday': 'Wed',
  'thu': 'Thu', 'thur': 'Thu', 'thurs': 'Thu', 'thursday': 'Thu',
  'fri': 'Fri', 'friday': 'Fri',
  'sat': 'Sat', 'saturday': 'Sat',
  'sun': 'Sun', 'sunday': 'Sun',
  // French
  'lun': 'Mon', 'lundi': 'Mon',
  'mar': 'Tue', 'mardi': 'Tue',
  'mer': 'Wed', 'mercredi': 'Wed',
  'jeu': 'Thu', 'jeudi': 'Thu',
  'ven': 'Fri', 'vendredi': 'Fri',
  'sam': 'Sat', 'samedi': 'Sat',
  'dim': 'Sun', 'dimanche': 'Sun',
  // German
  'mo': 'Mon', 'montag': 'Mon',
  'di': 'Tue', 'dienstag': 'Tue',
  'mi': 'Wed', 'mittwoch': 'Wed',
  'do': 'Thu', 'donnerstag': 'Thu',
  'fr': 'Fri', 'freitag': 'Fri',
  'sa': 'Sat', 'samstag': 'Sat',
  'so': 'Sun', 'sonntag': 'Sun',
};

function normalizeWeekday(text: string): string | null {
  const lower = text.toLowerCase().trim();
  return WEEKDAY_PATTERNS[lower] || null;
}

function containsTime(text: string): boolean {
  return /\b\d{1,2}:\d{2}\b/.test(text);
}

function extractTimes(text: string): string[] {
  const matches = text.match(/\b\d{1,2}:\d{2}\b/g) || [];
  return matches;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sheetIndex = formData.get('sheet_index') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file as buffer
    const fileBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });

    // Determine which sheets to process
    const sheetsToProcess = sheetIndex !== null
      ? [parseInt(sheetIndex, 10)]
      : workbook.SheetNames.map((_, i) => i);

    const previews: SheetPreview[] = [];

    for (const idx of sheetsToProcess) {
      const sheetName = workbook.SheetNames[idx];
      if (!sheetName) continue;

      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as any[][];

      if (jsonData.length === 0) continue;

      // Detect header row (look for weekday names)
      let headerRowIndex = -1;
      let detectedWeekdays: string[] = [];
      let weekdayColumnMap: Map<string, number> = new Map();
      let filmColumnIndex = 0;
      let weekdayColumnStart = 3;

      for (let i = 0; i < Math.min(10, jsonData.length); i++) {
        const row = jsonData[i];
        let weekdayCount = 0;
        const tempWeekdays: string[] = [];

        for (let j = 0; j < row.length; j++) {
          const cell = String(row[j] || '').trim();
          const normalized = normalizeWeekday(cell);
          if (normalized) {
            weekdayCount++;
            tempWeekdays.push(normalized);
            weekdayColumnMap.set(normalized, j);
            if (weekdayColumnStart > j) {
              weekdayColumnStart = j;
            }
          }
        }

        if (weekdayCount >= 5) {
          headerRowIndex = i;
          detectedWeekdays = tempWeekdays;
          break;
        }
      }

      // Detect film column (usually first column or "Film" column)
      if (headerRowIndex >= 0) {
        const headerRow = jsonData[headerRowIndex];
        for (let j = 0; j < headerRow.length; j++) {
          const cell = String(headerRow[j] || '').toLowerCase();
          if (cell.includes('film') || cell.includes('title') || cell.includes('titre')) {
            filmColumnIndex = j;
            break;
          }
        }
      }

      // Detect date range
      let dateRange: { start: string; end: string } | null = null;
      for (let i = 0; i < Math.min(5, jsonData.length); i++) {
        const row = jsonData[i];
        for (const cell of row) {
          const cellStr = String(cell || '');
          // Pattern: "04/06 - 10/06" or "04.06 - 10.06"
          const rangeMatch = cellStr.match(
            /(\d{1,2})[\/\.](\d{1,2})(?:[\/\.](\d{2,4}))?\s*[-–—]\s*(\d{1,2})[\/\.](\d{1,2})(?:[\/\.](\d{2,4}))?/
          );
          if (rangeMatch) {
            const year = rangeMatch[3]
              ? parseInt(rangeMatch[3], 10) < 100
                ? 2000 + parseInt(rangeMatch[3], 10)
                : parseInt(rangeMatch[3], 10)
              : new Date().getFullYear();

            const startDay = parseInt(rangeMatch[1], 10);
            const startMonth = parseInt(rangeMatch[2], 10);
            const endDay = parseInt(rangeMatch[4], 10);
            const endMonth = parseInt(rangeMatch[5], 10);

            dateRange = {
              start: `${year}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
              end: `${year}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
            };
            break;
          }
        }
        if (dateRange) break;
      }

      // Build row data
      const rows: RowData[] = [];
      let headers: string[] = [];

      for (let rowIdx = 0; rowIdx < Math.min(100, jsonData.length); rowIdx++) {
        const row = jsonData[rowIdx] || [];
        const cells: CellData[] = [];
        let hasContent = false;

        for (let colIdx = 0; colIdx < Math.max(row.length, 10); colIdx++) {
          const cellValue = String(row[colIdx] ?? '').trim();
          let cellType: CellData['type'] = 'data';

          if (!cellValue) {
            cellType = 'empty';
          } else if (rowIdx === headerRowIndex) {
            cellType = 'header';
          } else if (colIdx === filmColumnIndex && cellValue.length > 2) {
            cellType = 'movie';
            hasContent = true;
          } else if (containsTime(cellValue)) {
            cellType = 'time';
            hasContent = true;
          }

          cells.push({
            value: cellValue,
            type: cellType,
            row: rowIdx,
            col: colIdx,
          });
        }

        // Determine row type
        let rowType: RowData['rowType'] = 'data';
        if (rowIdx === headerRowIndex) {
          rowType = 'header';
          headers = row.map((c: any) => String(c || ''));
        } else if (!hasContent) {
          rowType = 'empty';
        }

        // Extract movie name and times for data rows
        let movieName: string | undefined;
        let times: { weekday: string; times: string[] }[] | undefined;

        if (rowType === 'data' && hasContent) {
          movieName = String(row[filmColumnIndex] || '').trim();
          times = [];

          for (const [weekday, colIndex] of weekdayColumnMap) {
            const cellValue = String(row[colIndex] || '').trim();
            const extractedTimes = extractTimes(cellValue);
            if (extractedTimes.length > 0) {
              times.push({ weekday, times: extractedTimes });
            }
          }
        }

        rows.push({
          cells,
          rowType,
          movieName,
          times,
        });
      }

      previews.push({
        index: idx,
        name: sheetName,
        headers,
        rows,
        dateRange,
        detectedWeekdays,
        filmColumnIndex,
        weekdayColumnStart,
      });
    }

    return NextResponse.json({
      success: true,
      fileName: file.name,
      previews,
    });
  } catch (error: any) {
    console.error('[Import Preview] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to read file' },
      { status: 500 }
    );
  }
}
