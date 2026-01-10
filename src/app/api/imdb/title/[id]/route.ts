import { NextRequest, NextResponse } from 'next/server';

const IMDB_API_BASE = 'https://api.imdbapi.dev/v2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const titleId = id.startsWith('tt') ? id : `tt${id}`;

  try {
    // Fetch all data in parallel
    const [titleRes, creditsRes, releaseDatesRes, akasRes, videosRes, certificatesRes, companyCreditsRes] =
      await Promise.all([
        fetch(`${IMDB_API_BASE}/titles/${titleId}`, { next: { revalidate: 3600 } }),
        fetch(`${IMDB_API_BASE}/titles/${titleId}/credits?pageSize=50&categories=actor,director,writer,composer`, { next: { revalidate: 3600 } }),
        fetch(`${IMDB_API_BASE}/titles/${titleId}/releaseDates`, { next: { revalidate: 3600 } }),
        fetch(`${IMDB_API_BASE}/titles/${titleId}/akas`, { next: { revalidate: 3600 } }),
        fetch(`${IMDB_API_BASE}/titles/${titleId}/videos?pageSize=5`, { next: { revalidate: 3600 } }),
        fetch(`${IMDB_API_BASE}/titles/${titleId}/certificates`, { next: { revalidate: 3600 } }),
        fetch(`${IMDB_API_BASE}/titles/${titleId}/companyCredits`, { next: { revalidate: 3600 } }),
      ]);

    if (!titleRes.ok) {
      console.error('IMDB title fetch failed:', titleRes.status);
      return NextResponse.json({ error: 'Title not found' }, { status: 404 });
    }

    const title = await titleRes.json();
    const credits = creditsRes.ok ? (await creditsRes.json()).credits || [] : [];
    const releaseDates = releaseDatesRes.ok ? (await releaseDatesRes.json()).releaseDates || [] : [];
    const akas = akasRes.ok ? (await akasRes.json()).akas || [] : [];
    const videos = videosRes.ok ? (await videosRes.json()).videos || [] : [];
    const certificates = certificatesRes.ok ? (await certificatesRes.json()).certificates || [] : [];
    const companyCredits = companyCreditsRes.ok ? (await companyCreditsRes.json()).companyCredits || [] : [];

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
