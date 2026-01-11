import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

interface SheetInfo {
  index: number;
  name: string;
  rowCount: number;
  dateRange: { start: string; end: string } | null;
  sampleData: string[];
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

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only .xlsx and .xls files are supported.' },
        { status: 400 }
      );
    }

    // Read file as buffer
    const fileBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });

    // Extract sheet information
    const sheets: SheetInfo[] = [];

    workbook.SheetNames.forEach((sheetName, index) => {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }) as any[][];

      // Skip empty sheets
      if (jsonData.length === 0) {
        return;
      }

      // Get row count (excluding header)
      const rowCount = jsonData.length > 1 ? jsonData.length - 1 : jsonData.length;

      // Try to detect date range from the sheet
      let dateRange: { start: string; end: string } | null = null;
      const dates: Date[] = [];

      // Scan for dates in the sheet
      for (const row of jsonData.slice(0, 50)) { // Check first 50 rows
        for (const cell of row) {
          if (cell) {
            // Check if cell looks like a date
            const dateValue = parseDate(cell);
            if (dateValue) {
              dates.push(dateValue);
            }
          }
        }
      }

      if (dates.length > 0) {
        dates.sort((a, b) => a.getTime() - b.getTime());
        dateRange = {
          start: dates[0].toISOString().split('T')[0],
          end: dates[dates.length - 1].toISOString().split('T')[0],
        };
      }

      // Get sample data (first few non-empty cells from first data row)
      const sampleData: string[] = [];
      if (jsonData.length > 1) {
        const firstDataRow = jsonData[1] || jsonData[0];
        for (const cell of firstDataRow) {
          if (cell && sampleData.length < 5) {
            const cellStr = String(cell).trim();
            if (cellStr && cellStr.length > 0 && cellStr.length < 100) {
              sampleData.push(cellStr);
            }
          }
        }
      }

      sheets.push({
        index,
        name: sheetName,
        rowCount,
        dateRange,
        sampleData,
      });
    });

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileSize: file.size,
      sheetCount: sheets.length,
      sheets,
    });
  } catch (error: any) {
    console.error('[Import Sheets] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to read file' },
      { status: 500 }
    );
  }
}

function parseDate(value: any): Date | null {
  if (!value) return null;

  // If it's already a Date
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }

  const str = String(value).trim();
  if (!str) return null;

  // Try various date formats
  const patterns = [
    // DD.MM.YYYY
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  ];

  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match) {
      let year: number, month: number, day: number;
      if (pattern === patterns[2]) {
        // YYYY-MM-DD
        [, year, month, day] = match.map(Number) as [any, number, number, number];
      } else {
        // DD.MM.YYYY or DD/MM/YYYY
        [, day, month, year] = match.map(Number) as [any, number, number, number];
      }

      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime()) && date.getFullYear() >= 2020 && date.getFullYear() <= 2030) {
        return date;
      }
    }
  }

  return null;
}
