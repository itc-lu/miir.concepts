import { NextRequest, NextResponse } from 'next/server';

const IMDB_API_BASE = 'https://api.imdbapi.dev';

// Helper to safely fetch JSON with error handling
async function safeFetch(url: string) {
  try {
    console.log('[IMDB Title] Fetching:', url);
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    });
    console.log('[IMDB Title] Response status for', url, ':', response.status);
    if (!response.ok) {
      console.error('[IMDB Title] Non-OK response:', response.status, await response.text());
      return null;
    }
    const data = await response.json();
    console.log('[IMDB Title] Data keys for', url, ':', Object.keys(data));
    return data;
  } catch (error) {
    console.error('[IMDB Title] Fetch error for', url, error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const titleId = id.startsWith('tt') ? id : `tt${id}`;
  console.log('[IMDB Title] Looking up:', titleId);

  try {
    // Fetch title data first (required)
    const titleData = await safeFetch(`${IMDB_API_BASE}/titles/${titleId}`);

    if (!titleData) {
      console.error('[IMDB Title] Title data not found for:', titleId);
      return NextResponse.json({ error: 'Title not found' }, { status: 404 });
    }

    console.log('[IMDB Title] Got title data:', {
      id: titleData.id,
      primaryTitle: titleData.primaryTitle,
      type: titleData.type,
      startYear: titleData.startYear,
      runtimeSeconds: titleData.runtimeSeconds,
    });

    // Fetch supplementary data in parallel (optional - don't fail if unavailable)
    const [creditsData, releaseDatesData, akasData, videosData, certificatesData, companyCreditsData] =
      await Promise.all([
        safeFetch(
          `${IMDB_API_BASE}/titles/${titleId}/credits?pageSize=50&categories=actor,director,writer,composer`
        ),
        safeFetch(`${IMDB_API_BASE}/titles/${titleId}/releaseDates`),
        safeFetch(`${IMDB_API_BASE}/titles/${titleId}/akas`),
        safeFetch(`${IMDB_API_BASE}/titles/${titleId}/videos?pageSize=5`),
        safeFetch(`${IMDB_API_BASE}/titles/${titleId}/certificates`),
        safeFetch(`${IMDB_API_BASE}/titles/${titleId}/companyCredits`),
      ]);

    // Title API returns data directly (not nested), plus may include directors/stars arrays
    // Keep runtimeSeconds for frontend compatibility (it converts to minutes)
    const title = {
      id: titleData.id,
      type: titleData.type,
      primaryTitle: titleData.primaryTitle,
      originalTitle: titleData.originalTitle || titleData.primaryTitle,
      startYear: titleData.startYear,
      year: titleData.startYear, // Also provide 'year' for compatibility
      endYear: titleData.endYear,
      runtimeSeconds: titleData.runtimeSeconds, // Keep original for frontend conversion
      runtimeMinutes: titleData.runtimeSeconds ? Math.round(titleData.runtimeSeconds / 60) : null,
      genres: titleData.genres || [],
      plot: titleData.plot,
      rating: titleData.rating,
      metacritic: titleData.metacritic,
      primaryImage: titleData.primaryImage,
      poster: titleData.primaryImage, // Also provide 'poster' for compatibility
      countriesOfOrigin: titleData.originCountries || [],
      originCountries: titleData.originCountries || [],
      spokenLanguages: titleData.spokenLanguages || [],
    };

    // The API may return directors/stars directly in the title response
    const directorsFromTitle = titleData.directors || [];
    const starsFromTitle = titleData.stars || [];

    // Parse credits by category (from credits endpoint, if available)
    const credits = creditsData?.credits || [];
    const directors =
      credits.length > 0
        ? credits.filter((c: any) => c.category === 'director')
        : directorsFromTitle.map((d: any) => ({
            id: d.id,
            displayName: d.displayName,
            category: 'director',
          }));
    const writers = credits.filter((c: any) => c.category === 'writer');
    const composers = credits.filter((c: any) => c.category === 'composer');
    const cast =
      credits.length > 0
        ? credits.filter((c: any) => c.category === 'actor').slice(0, 15)
        : starsFromTitle.map((name: string, i: number) => ({
            id: `star-${i}`,
            displayName: name,
            category: 'actor',
          }));

    const releaseDates = releaseDatesData?.releaseDates || [];
    const akas = akasData?.akas || [];
    const videos = videosData?.videos || [];
    const certificates = certificatesData?.certificates || [];
    const companyCredits = companyCreditsData?.companyCredits || [];

    // Get production companies
    const productionCompanies = companyCredits.filter(
      (c: any) => c.category?.toLowerCase() === 'production'
    );

    // Find trailer video
    const trailer = videos.find((v: any) => v.contentType?.toLowerCase().includes('trailer'));

    // Helper functions
    const getLocalizedTitle = (countryCode: string) => {
      return akas.find(
        (a: any) =>
          a.country?.toLowerCase() === countryCode.toLowerCase() ||
          a.language?.toLowerCase() === countryCode.toLowerCase()
      )?.title;
    };

    const getReleaseDate = (countryCode: string) => {
      return releaseDates.find(
        (r: any) => r.country?.toLowerCase() === countryCode.toLowerCase()
      )?.date;
    };

    const getCertificate = (countryCode: string) => {
      return certificates.find(
        (c: any) => c.country?.toLowerCase() === countryCode.toLowerCase()
      );
    };

    console.log('[IMDB Title] Response ready for:', titleId, {
      hasCredits: credits.length > 0,
      directorsCount: directors.length,
      castCount: cast.length,
    });

    return NextResponse.json({
      title,
      directors,
      writers,
      composers,
      cast,
      productionCompanies,
      trailer,
      localizedTitles: {
        de: getLocalizedTitle('de') || getLocalizedTitle('germany'),
        fr: getLocalizedTitle('fr') || getLocalizedTitle('france'),
        lu:
          getLocalizedTitle('lu') || getLocalizedTitle('luxembourg') || getLocalizedTitle('de'),
        be: getLocalizedTitle('be') || getLocalizedTitle('belgium'),
      },
      countryReleaseDates: {
        de: getReleaseDate('de') || getReleaseDate('germany'),
        fr: getReleaseDate('fr') || getReleaseDate('france'),
        lu: getReleaseDate('lu') || getReleaseDate('luxembourg'),
        be: getReleaseDate('be') || getReleaseDate('belgium'),
      },
      countryCertificates: {
        de: getCertificate('de') || getCertificate('germany'),
        fr: getCertificate('fr') || getCertificate('france'),
        lu: getCertificate('lu') || getCertificate('luxembourg'),
        be: getCertificate('be') || getCertificate('belgium'),
      },
    });
  } catch (error) {
    console.error('[IMDB Title] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch title' }, { status: 500 });
  }
}
