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
    const response = await fetch(
      `${IMDB_API_BASE}/search/titles?query=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      console.error('IMDB search failed:', response.status, await response.text());
      return NextResponse.json({ results: [], error: 'Search failed' });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('IMDB search error:', error);
    return NextResponse.json({ results: [], error: 'Search failed' });
  }
}
