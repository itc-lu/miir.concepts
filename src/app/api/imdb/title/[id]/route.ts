import { NextRequest, NextResponse } from 'next/server';

const IMDB_API_BASE = 'https://api.imdbapi.dev';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const { id } = await context.params;
    const titleId = id.startsWith('tt') ? id : `tt${id}`;

    console.log('[IMDB Title] Fetching:', titleId);

    // The main /titles/{id} endpoint already includes directors, writers, stars
    const url = `${IMDB_API_BASE}/titles/${titleId}`;
    console.log('[IMDB Title] URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CAT-Cinema-Automation-Tool/1.0',
      },
    });

    const elapsed = Date.now() - startTime;
    console.log('[IMDB Title] Response:', response.status, `${elapsed}ms`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('[IMDB Title] API error:', response.status, errorText.slice(0, 200));
      return NextResponse.json(
        { error: `IMDB API returned ${response.status}`, titleId },
        { status: response.status === 404 ? 404 : 502 }
      );
    }

    const data = await response.json();

    console.log('[IMDB Title] Success:', {
      id: data.id,
      title: data.primaryTitle,
      year: data.startYear,
      directorsCount: data.directors?.length || 0,
      starsCount: data.stars?.length || 0,
    });

    // Return the data mapped to our expected format
    // The API already returns directors, writers, stars as arrays
    return NextResponse.json({
      title: {
        id: data.id,
        type: data.type,
        primaryTitle: data.primaryTitle,
        originalTitle: data.originalTitle || data.primaryTitle,
        startYear: data.startYear,
        year: data.startYear,
        endYear: data.endYear,
        runtimeSeconds: data.runtimeSeconds,
        runtimeMinutes: data.runtimeSeconds ? Math.round(data.runtimeSeconds / 60) : null,
        genres: data.genres || [],
        plot: data.plot,
        rating: data.rating,
        metacritic: data.metacritic,
        primaryImage: data.primaryImage,
        poster: data.primaryImage,
        originCountries: data.originCountries || [],
        spokenLanguages: data.spokenLanguages || [],
        interests: data.interests || [],
      },
      // Directors come directly from the API response
      directors: (data.directors || []).map((d: any) => ({
        id: d.id,
        displayName: d.displayName,
        primaryImage: d.primaryImage,
        category: 'director',
      })),
      // Writers come directly from the API response
      writers: (data.writers || []).map((w: any) => ({
        id: w.id,
        displayName: w.displayName,
        primaryImage: w.primaryImage,
        category: 'writer',
      })),
      // Stars/cast come directly from the API response
      cast: (data.stars || []).map((s: any) => ({
        id: s.id,
        displayName: s.displayName,
        primaryImage: s.primaryImage,
        category: 'actor',
      })),
      // These would need separate API calls - leaving empty for now
      productionCompanies: [],
      trailer: null,
      localizedTitles: {},
      countryReleaseDates: {},
      countryCertificates: {},
    });
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error('[IMDB Title] Error after', elapsed, 'ms:', {
      name: error?.name,
      message: error?.message,
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch title from IMDB',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
