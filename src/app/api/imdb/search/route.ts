import { NextRequest, NextResponse } from 'next/server';

const IMDB_API_BASE = 'https://api.imdbapi.dev';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const limit = searchParams.get('limit') || '10';

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const startTime = Date.now();
  try {
    const url = `${IMDB_API_BASE}/search/titles?query=${encodeURIComponent(query)}&limit=${limit}`;
    console.log('[IMDB Search] Fetching:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CAT-Cinema-Automation-Tool/1.0',
      },
      // Don't use AbortSignal.timeout - not reliably supported in all serverless environments
    });

    const elapsed = Date.now() - startTime;
    console.log('[IMDB Search] Response status:', response.status, `time=${elapsed}ms`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No body');
      console.error('[IMDB Search] Failed:', response.status, errorText.slice(0, 200));
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
    const elapsed = Date.now() - startTime;
    console.error('[IMDB Search] Error after', elapsed, 'ms:', {
      name: error?.name,
      message: error?.message,
      cause: error?.cause?.message || error?.cause,
    });
    return NextResponse.json({
      results: [],
      error: error?.name === 'TimeoutError' ? 'Search timed out' : 'Search failed',
      details: error?.message,
    });
  }
}
