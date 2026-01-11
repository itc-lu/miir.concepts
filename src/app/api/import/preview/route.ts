import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

interface CellData {
  value: string;
  type: 'header' | 'movie' | 'time' | 'date-range' | 'data' | 'empty';
  row: number;
  col: number;
}

interface MovieRow {
  filmName: string;
  importTitle: string;
  times: { weekday: string; date: string; times: string[] }[];
}

interface SheetPreview {
  index: number;
  name: string;
  rawCells: CellData[][];
  dateRange: { start: string; end: string; text: string } | null;
  extractedDates: { weekday: string; date: string }[];
  detectedWeekdays: string[];
  movies: MovieRow[];
  headerRowIndex: number;
  filmColumnIndex: number;
}

// Standard weekday names used in Kinepolis format
const WEEKDAY_NAMES = new Set(['Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat', 'Sun']);

// Map from file weekday to standard short form
const WEEKDAY_MAP: Record<string, string> = {
  'Mon': 'Mon', 'Monday': 'Mon',
  'Tues': 'Tue', 'Tue': 'Tue', 'Tuesday': 'Tue',
  'Wed': 'Wed', 'Wednesday': 'Wed',
  'Thurs': 'Thu', 'Thu': 'Thu', 'Thursday': 'Thu',
  'Fri': 'Fri', 'Friday': 'Fri',
  'Sat': 'Sat', 'Saturday': 'Sat',
  'Sun': 'Sun', 'Sunday': 'Sun',
};

// Month names for parsing
const MONTH_NAMES: Record<string, number> = {
  'january': 1, 'jan': 1,
  'february': 2, 'feb': 2,
  'march': 3, 'mar': 3,
  'april': 4, 'apr': 4,
  'may': 5,
  'june': 6, 'jun': 6,
  'july': 7, 'jul': 7,
  'august': 8, 'aug': 8,
  'september': 9, 'sep': 9, 'sept': 9,
  'october': 10, 'oct': 10,
  'november': 11, 'nov': 11,
  'december': 12, 'dec': 12,
};

function isWeekDatesRow(row: any[]): boolean {
  // Check if row contains a date range like "Wednesday, 28 May 2025 - Tuesday, 3 June 2025"
  return row.some(cell => {
    const str = String(cell || '');
    return str.includes('-') && /\d{1,2}\s+[A-Za-z]+\s+\d{4}/.test(str);
  });
}

function isDayColumnsRow(row: any[]): boolean {
  // Check if row contains weekday names
  return row.some(cell => WEEKDAY_NAMES.has(String(cell || '').trim()));
}

function parseFlexibleDate(dateStr: string): Date | null {
  // Try formats: "28 May 2025" or "May 28, 2025"
  const formats = [
    /(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})/,  // 28 May 2025 or 28 May, 2025
    /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/,  // May 28 2025 or May 28, 2025
  ];

  for (const regex of formats) {
    const match = dateStr.match(regex);
    if (match) {
      let day: number, month: number, year: number;

      if (/^\d+$/.test(match[1])) {
        // First format: day month year
        day = parseInt(match[1], 10);
        month = MONTH_NAMES[match[2].toLowerCase()] || 0;
        year = parseInt(match[3], 10);
      } else {
        // Second format: month day year
        month = MONTH_NAMES[match[1].toLowerCase()] || 0;
        day = parseInt(match[2], 10);
        year = parseInt(match[3], 10);
      }

      if (month > 0 && day > 0 && year > 0) {
        return new Date(year, month - 1, day);
      }
    }
  }

  return null;
}

function extractDateRange(row: any[]): { start: Date; end: Date; text: string } | null {
  for (const cell of row) {
    const str = String(cell || '');
    if (!str.includes('-')) continue;

    // Extract date portions from "Wednesday, 28 May 2025 - Tuesday, 3 June 2025"
    const regex = /(?:[A-Za-z]+day,?\s*)?(\d{1,2}\s+[A-Za-z]+|\b[A-Za-z]+\s+\d{1,2})(?:,)?\s*(\d{4})?\s*[-–—]\s*(?:[A-Za-z]+day,?\s*)?(\d{1,2}\s+[A-Za-z]+|\b[A-Za-z]+\s+\d{1,2})(?:,)?\s*(\d{4})?/i;

    const match = str.match(regex);
    if (match) {
      const currentYear = new Date().getFullYear();
      const startYear = match[2] || match[4] || String(currentYear);
      const endYear = match[4] || match[2] || String(currentYear);

      const startDate = parseFlexibleDate(`${match[1]}, ${startYear}`);
      const endDate = parseFlexibleDate(`${match[3]}, ${endYear}`);

      if (startDate && endDate) {
        return { start: startDate, end: endDate, text: str };
      }
    }
  }
  return null;
}

function generateDateRange(start: Date, end: Date): { weekday: string; date: string }[] {
  const dates: { weekday: string; date: string }[] = [];
  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const current = new Date(start);
  while (current <= end) {
    dates.push({
      weekday: weekdayNames[current.getDay()],
      date: current.toISOString().split('T')[0],
    });
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function containsTime(text: string): boolean {
  return /\b\d{1,2}:\d{2}\b/.test(text);
}

function extractTimes(text: string): string[] {
  // Handle newline-separated times like "10:15\n14:15"
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

      // Step 1: Find the week dates row and day columns row (like Odoo parser)
      let dateRangeResult: { start: Date; end: Date; text: string } | null = null;
      let dayColumnsRowIndex = -1;
      let dayColumnsDict: Map<number, string> = new Map(); // col index -> weekday name
      let filmColumnIndex = -1;
      let extractedDates: { weekday: string; date: string }[] = [];

      // Scan first 10 rows for structure
      for (let rowIdx = 0; rowIdx < Math.min(10, jsonData.length); rowIdx++) {
        const row = jsonData[rowIdx] || [];

        // Check for week dates row
        if (isWeekDatesRow(row)) {
          dateRangeResult = extractDateRange(row);
          if (dateRangeResult) {
            extractedDates = generateDateRange(dateRangeResult.start, dateRangeResult.end);
          }
        }

        // Check for day columns row
        if (isDayColumnsRow(row)) {
          for (let colIdx = 0; colIdx < row.length; colIdx++) {
            const cellValue = String(row[colIdx] || '').trim();
            if (WEEKDAY_NAMES.has(cellValue)) {
              dayColumnsDict.set(colIdx, cellValue);
            }
            if (cellValue.toLowerCase() === 'film') {
              filmColumnIndex = colIdx;
            }
          }
          dayColumnsRowIndex = rowIdx;
          break; // Stop after finding day columns
        }
      }

      // If film column not found, default to first column after finding day row
      if (filmColumnIndex === -1 && dayColumnsRowIndex >= 0) {
        filmColumnIndex = 1; // Usually column B (index 1)
      }

      // Step 2: Build raw cells data for preview
      const rawCells: CellData[][] = [];
      const maxRows = Math.min(50, jsonData.length);

      for (let rowIdx = 0; rowIdx < maxRows; rowIdx++) {
        const row = jsonData[rowIdx] || [];
        const cells: CellData[] = [];

        // Find max columns in this section
        const maxCols = Math.max(
          ...Array.from(dayColumnsDict.keys()),
          filmColumnIndex + 1,
          20
        );

        for (let colIdx = 0; colIdx <= maxCols; colIdx++) {
          const cellValue = String(row[colIdx] ?? '').trim();
          let cellType: CellData['type'] = 'data';

          if (!cellValue) {
            cellType = 'empty';
          } else if (rowIdx === dayColumnsRowIndex) {
            cellType = 'header';
          } else if (dateRangeResult && cellValue.includes(dateRangeResult.text.substring(0, 20))) {
            cellType = 'date-range';
          } else if (colIdx === filmColumnIndex && cellValue.length > 3 && rowIdx > dayColumnsRowIndex) {
            cellType = 'movie';
          } else if (containsTime(cellValue)) {
            cellType = 'time';
          }

          cells.push({
            value: cellValue.replace(/\n/g, ' '),
            type: cellType,
            row: rowIdx,
            col: colIdx,
          });
        }

        rawCells.push(cells);
      }

      // Step 3: Extract movies with their session times
      const movies: MovieRow[] = [];

      // Map weekday names from file to standard short names for date matching
      const weekdayToStandard: Record<string, string> = {
        'Mon': 'Mon',
        'Tues': 'Tue',
        'Wed': 'Wed',
        'Thurs': 'Thu',
        'Fri': 'Fri',
        'Sat': 'Sat',
        'Sun': 'Sun',
      };

      if (dayColumnsRowIndex >= 0) {
        for (let rowIdx = dayColumnsRowIndex + 1; rowIdx < jsonData.length; rowIdx++) {
          const row = jsonData[rowIdx] || [];
          const filmName = String(row[filmColumnIndex] || '').trim();

          if (!filmName || filmName.length < 3) continue;

          const movieRow: MovieRow = {
            filmName,
            importTitle: filmName,
            times: [],
          };

          let hasAnyTime = false;

          // Check each weekday column - times may be at the column index OR one column before
          for (const [colIdx, weekdayName] of dayColumnsDict) {
            // Try column at header index first, then column-1 (Kinepolis quirk)
            let showTime = String(row[colIdx] || '').trim();
            if (!showTime && colIdx > 0) {
              showTime = String(row[colIdx - 1] || '').trim();
            }

            const times = extractTimes(showTime);
            if (times.length > 0) {
              hasAnyTime = true;

              // Find the corresponding date
              const standardWeekday = weekdayToStandard[weekdayName] || weekdayName;
              const dateEntry = extractedDates.find(d => d.weekday === standardWeekday);

              movieRow.times.push({
                weekday: weekdayName,
                date: dateEntry?.date || '',
                times,
              });
            }
          }

          if (hasAnyTime) {
            movies.push(movieRow);
          }
        }
      }

      const detectedWeekdays = Array.from(dayColumnsDict.values());

      previews.push({
        index: idx,
        name: sheetName,
        rawCells,
        dateRange: dateRangeResult ? {
          start: dateRangeResult.start.toISOString().split('T')[0],
          end: dateRangeResult.end.toISOString().split('T')[0],
          text: dateRangeResult.text,
        } : null,
        extractedDates,
        detectedWeekdays,
        movies,
        headerRowIndex: dayColumnsRowIndex,
        filmColumnIndex,
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
