import { NextRequest, NextResponse } from 'next/server';

const IMDB_API_BASE = 'https://api.imdbapi.dev';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const limit = searchParams.get('limit') || '10';

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const url = `${IMDB_API_BASE}/search/titles?query=${encodeURIComponent(query)}&limit=${limit}`;
    console.log('[IMDB Search] Fetching:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log('[IMDB Search] Response status:', response.status);

    if (!response.ok) {
      console.error('[IMDB Search] Failed:', response.status);
      return NextResponse.json({ results: [], error: `Search failed: ${response.status}` });
    }

    const data = await response.json();
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
    console.error('[IMDB Search] Error:', error?.message || String(error));
    return NextResponse.json({ results: [], error: 'Search failed' });
  }
}
