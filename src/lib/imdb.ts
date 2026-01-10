// IMDB API Service using imdbapi.dev (free, no authentication required)
// API Documentation: https://imdbapi.dev/

const IMDB_API_BASE = 'https://api.imdbapi.dev';

export interface IMDBSearchResult {
  id: string;  // e.g., "tt1234567"
  title: string;
  type: string;  // MOVIE, TV_SERIES, etc.
  year?: number;
  poster?: {
    url: string;
    width: number;
    height: number;
  };
}

export interface IMDBTitle {
  id: string;
  type: string;
  primaryTitle: string;
  originalTitle: string;
  releaseDate?: string;
  year?: number;
  endYear?: number;
  runtimeSeconds?: number;
  plot?: string;
  rating?: {
    aggregate: number;
    voteCount: number;
  };
  genres?: string[];
  poster?: {
    url: string;
    width: number;
    height: number;
  };
  backdrop?: {
    url: string;
    width: number;
    height: number;
  };
  countriesOfOrigin?: string[];
  spokenLanguages?: string[];
  productionStatus?: string;
  externalLinks?: Array<{
    label: string;
    url: string;
  }>;
}

export interface IMDBCredit {
  name: {
    id: string;
    displayName: string;
    avatars?: Array<{ url: string }>;
  };
  category: string;
  characters?: string[];
  jobs?: string[];
  episodeCount?: number;
}

export interface IMDBReleaseDate {
  country: string;
  date: string;
  attributes?: string[];
}

export interface IMDBAKA {
  country?: string;
  language?: string;
  title: string;
  attributes?: string[];
}

export interface IMDBImage {
  url: string;
  width: number;
  height: number;
  caption?: string;
  type?: string;
}

export interface IMDBVideo {
  id: string;
  title: string;
  description?: string;
  thumbnail?: {
    url: string;
    width: number;
    height: number;
  };
  duration: number;
  contentType: string;
  playbackURLs?: Array<{
    mimeType: string;
    url: string;
  }>;
}

export interface IMDBCertificate {
  country: string;
  certificate: string;
  attributes?: string[];
}

export interface IMDBCompanyCredit {
  company: {
    id: string;
    name: string;
  };
  category: string;
  countries?: string[];
}

// API Functions
export async function searchTitles(query: string, limit = 20): Promise<IMDBSearchResult[]> {
  try {
    const response = await fetch(
      `${IMDB_API_BASE}/search/titles?query=${encodeURIComponent(query)}&limit=${limit}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      console.error('IMDB search failed:', response.status);
      return [];
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('IMDB search error:', error);
    return [];
  }
}

export async function getTitle(titleId: string): Promise<IMDBTitle | null> {
  try {
    // Ensure proper format (tt1234567)
    const formattedId = titleId.startsWith('tt') ? titleId : `tt${titleId}`;

    const response = await fetch(
      `${IMDB_API_BASE}/titles/${formattedId}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      console.error('IMDB title fetch failed:', response.status);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('IMDB title error:', error);
    return null;
  }
}

export async function getTitleCredits(
  titleId: string,
  categories?: string[],
  pageSize = 50
): Promise<IMDBCredit[]> {
  try {
    const formattedId = titleId.startsWith('tt') ? titleId : `tt${titleId}`;
    let url = `${IMDB_API_BASE}/titles/${formattedId}/credits?pageSize=${pageSize}`;

    if (categories && categories.length > 0) {
      url += `&categories=${categories.join(',')}`;
    }

    const response = await fetch(url, { next: { revalidate: 3600 } });

    if (!response.ok) {
      console.error('IMDB credits fetch failed:', response.status);
      return [];
    }

    const data = await response.json();
    return data.credits || [];
  } catch (error) {
    console.error('IMDB credits error:', error);
    return [];
  }
}

export async function getTitleReleaseDates(titleId: string): Promise<IMDBReleaseDate[]> {
  try {
    const formattedId = titleId.startsWith('tt') ? titleId : `tt${titleId}`;

    const response = await fetch(
      `${IMDB_API_BASE}/titles/${formattedId}/releaseDates`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      console.error('IMDB release dates fetch failed:', response.status);
      return [];
    }

    const data = await response.json();
    return data.releaseDates || [];
  } catch (error) {
    console.error('IMDB release dates error:', error);
    return [];
  }
}

export async function getTitleAKAs(titleId: string): Promise<IMDBAKA[]> {
  try {
    const formattedId = titleId.startsWith('tt') ? titleId : `tt${titleId}`;

    const response = await fetch(
      `${IMDB_API_BASE}/titles/${formattedId}/akas`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      console.error('IMDB AKAs fetch failed:', response.status);
      return [];
    }

    const data = await response.json();
    return data.akas || [];
  } catch (error) {
    console.error('IMDB AKAs error:', error);
    return [];
  }
}

export async function getTitleImages(titleId: string, pageSize = 20): Promise<IMDBImage[]> {
  try {
    const formattedId = titleId.startsWith('tt') ? titleId : `tt${titleId}`;

    const response = await fetch(
      `${IMDB_API_BASE}/titles/${formattedId}/images?pageSize=${pageSize}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      console.error('IMDB images fetch failed:', response.status);
      return [];
    }

    const data = await response.json();
    return data.images || [];
  } catch (error) {
    console.error('IMDB images error:', error);
    return [];
  }
}

export async function getTitleVideos(titleId: string, pageSize = 10): Promise<IMDBVideo[]> {
  try {
    const formattedId = titleId.startsWith('tt') ? titleId : `tt${titleId}`;

    const response = await fetch(
      `${IMDB_API_BASE}/titles/${formattedId}/videos?pageSize=${pageSize}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      console.error('IMDB videos fetch failed:', response.status);
      return [];
    }

    const data = await response.json();
    return data.videos || [];
  } catch (error) {
    console.error('IMDB videos error:', error);
    return [];
  }
}

export async function getTitleCertificates(titleId: string): Promise<IMDBCertificate[]> {
  try {
    const formattedId = titleId.startsWith('tt') ? titleId : `tt${titleId}`;

    const response = await fetch(
      `${IMDB_API_BASE}/titles/${formattedId}/certificates`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      console.error('IMDB certificates fetch failed:', response.status);
      return [];
    }

    const data = await response.json();
    return data.certificates || [];
  } catch (error) {
    console.error('IMDB certificates error:', error);
    return [];
  }
}

export async function getTitleCompanyCredits(titleId: string): Promise<IMDBCompanyCredit[]> {
  try {
    const formattedId = titleId.startsWith('tt') ? titleId : `tt${titleId}`;

    const response = await fetch(
      `${IMDB_API_BASE}/titles/${formattedId}/companyCredits`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      console.error('IMDB company credits fetch failed:', response.status);
      return [];
    }

    const data = await response.json();
    return data.companyCredits || [];
  } catch (error) {
    console.error('IMDB company credits error:', error);
    return [];
  }
}

// Get comprehensive movie data
export async function getFullIMDBData(titleId: string) {
  const formattedId = titleId.startsWith('tt') ? titleId : `tt${titleId}`;

  const [title, credits, releaseDates, akas, images, videos, certificates, companyCredits] =
    await Promise.all([
      getTitle(formattedId),
      getTitleCredits(formattedId, ['actor', 'director', 'writer', 'composer']),
      getTitleReleaseDates(formattedId),
      getTitleAKAs(formattedId),
      getTitleImages(formattedId),
      getTitleVideos(formattedId),
      getTitleCertificates(formattedId),
      getTitleCompanyCredits(formattedId),
    ]);

  if (!title) return null;

  // Parse credits by category
  const directors = credits.filter(c => c.category === 'director');
  const writers = credits.filter(c => c.category === 'writer');
  const composers = credits.filter(c => c.category === 'composer');
  const cast = credits.filter(c => c.category === 'actor').slice(0, 15);

  // Get production companies
  const productionCompanies = companyCredits.filter(
    c => c.category === 'production' || c.category === 'Production'
  );

  // Get localized titles for key countries
  const getLocalizedTitle = (countryCode: string) => {
    return akas.find(a =>
      a.country?.toLowerCase() === countryCode.toLowerCase() ||
      a.language?.toLowerCase() === countryCode.toLowerCase()
    )?.title;
  };

  // Get release dates for key countries
  const getReleaseDate = (countryCode: string) => {
    return releaseDates.find(r =>
      r.country?.toLowerCase() === countryCode.toLowerCase()
    )?.date;
  };

  // Get age ratings for key countries
  const getCertificate = (countryCode: string) => {
    return certificates.find(c =>
      c.country?.toLowerCase() === countryCode.toLowerCase()
    );
  };

  // Find trailer video
  const trailer = videos.find(v =>
    v.contentType?.toLowerCase().includes('trailer')
  );

  return {
    title,
    credits,
    releaseDates,
    akas,
    images,
    videos,
    certificates,
    companyCredits,
    // Processed data
    directors,
    writers,
    composers,
    cast,
    productionCompanies,
    trailer,
    // Localized data
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
  };
}

// Helper to convert IMDB runtime (seconds) to minutes
export function imdbRuntimeToMinutes(runtimeSeconds?: number): number | null {
  if (!runtimeSeconds) return null;
  return Math.round(runtimeSeconds / 60);
}

// Helper to extract year from IMDB release date
export function extractYear(releaseDate?: string): number | null {
  if (!releaseDate) return null;
  const match = releaseDate.match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}
