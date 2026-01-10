import { NextRequest, NextResponse } from 'next/server';

const IMDB_API_BASE = 'https://api.imdbapi.dev/v2';

// Helper to safely fetch JSON with error handling
async function safeFetch(url: string) {
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Fetch error for', url, error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const titleId = id.startsWith('tt') ? id : `tt${id}`;

  try {
    // Fetch title data first (required)
    const titleData = await safeFetch(`${IMDB_API_BASE}/titles/${titleId}`);

    if (!titleData) {
      console.error('IMDB title fetch failed for:', titleId);
      return NextResponse.json({ error: 'Title not found' }, { status: 404 });
    }

    // Fetch supplementary data in parallel (optional - don't fail if unavailable)
    const [creditsData, releaseDatesData, akasData, videosData, certificatesData, companyCreditsData] =
      await Promise.all([
        safeFetch(`${IMDB_API_BASE}/titles/${titleId}/credits?pageSize=50&categories=actor,director,writer,composer`),
        safeFetch(`${IMDB_API_BASE}/titles/${titleId}/releaseDates`),
        safeFetch(`${IMDB_API_BASE}/titles/${titleId}/akas`),
        safeFetch(`${IMDB_API_BASE}/titles/${titleId}/videos?pageSize=5`),
        safeFetch(`${IMDB_API_BASE}/titles/${titleId}/certificates`),
        safeFetch(`${IMDB_API_BASE}/titles/${titleId}/companyCredits`),
      ]);

    // The title data is the main response object
    const title = titleData;
    const credits = creditsData?.credits || [];
    const releaseDates = releaseDatesData?.releaseDates || [];
    const akas = akasData?.akas || [];
    const videos = videosData?.videos || [];
    const certificates = certificatesData?.certificates || [];
    const companyCredits = companyCreditsData?.companyCredits || [];

    // Parse credits by category
    const directors = credits.filter((c: any) => c.category === 'director');
    const writers = credits.filter((c: any) => c.category === 'writer');
    const composers = credits.filter((c: any) => c.category === 'composer');
    const cast = credits.filter((c: any) => c.category === 'actor').slice(0, 15);

    // Get production companies
    const productionCompanies = companyCredits.filter(
      (c: any) => c.category?.toLowerCase() === 'production'
    );

    // Find trailer video
    const trailer = videos.find((v: any) =>
      v.contentType?.toLowerCase().includes('trailer')
    );

    // Helper functions
    const getLocalizedTitle = (countryCode: string) => {
      return akas.find((a: any) =>
        a.country?.toLowerCase() === countryCode.toLowerCase() ||
        a.language?.toLowerCase() === countryCode.toLowerCase()
      )?.title;
    };

    const getReleaseDate = (countryCode: string) => {
      return releaseDates.find((r: any) =>
        r.country?.toLowerCase() === countryCode.toLowerCase()
      )?.date;
    };

    const getCertificate = (countryCode: string) => {
      return certificates.find((c: any) =>
        c.country?.toLowerCase() === countryCode.toLowerCase()
      );
    };

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
        lu: getLocalizedTitle('lu') || getLocalizedTitle('luxembourg') || getLocalizedTitle('de'),
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
    console.error('IMDB title error:', error);
    return NextResponse.json({ error: 'Failed to fetch title' }, { status: 500 });
  }
}
