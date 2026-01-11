import { NextRequest, NextResponse } from 'next/server';

const IMDB_API_BASE = 'https://api.imdbapi.dev';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const limit = searchParams.get('limit') || '10';

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const url = `${IMDB_API_BASE}/search/titles?query=${encodeURIComponent(query)}&limit=${limit}`;
    console.log('[IMDB Search] Fetching:', url);

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CAT-Cinema-Automation/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    console.log('[IMDB Search] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[IMDB Search] Failed:', response.status, errorText);
      return NextResponse.json({ results: [], error: `Search failed: ${response.status}` });
    }

    const data = await response.json();
    console.log('[IMDB Search] Raw response keys:', Object.keys(data));
    console.log('[IMDB Search] Found titles:', data.titles?.length || 0);

    // API returns { titles: [...] }, transform to { results: [...] } for frontend
    const results = (data.titles || []).map((title: any) => ({
      id: title.id,
      title: title.primaryTitle || title.originalTitle,
      originalTitle: title.originalTitle,
      year: title.startYear,
      type: title.type,
      posterUrl: title.primaryImage?.url,
      rating: title.rating?.aggregateRating,
      voteCount: title.rating?.voteCount,
    }));

    return NextResponse.json({ results });
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error('[IMDB Search] Request timeout');
      return NextResponse.json({ results: [], error: 'Search timed out' });
    }
    console.error('[IMDB Search] Error:', error.message || error);
    return NextResponse.json({ results: [], error: 'Search failed' });
  }
}
