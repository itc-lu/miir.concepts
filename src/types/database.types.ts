// CAT Cinema Automation Tool - Database Types
// Auto-generated types for Supabase tables

export type UserRole = 'super_admin' | 'admin' | 'editor' | 'viewer';
export type MovieStatus = 'draft' | 'pending_review' | 'verified' | 'archived';
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ExportStatus = 'pending' | 'generating' | 'completed' | 'failed';

// ============================================================================
// REFERENCE TABLES
// ============================================================================

export interface Country {
  id: string;
  code: string;
  name: string;
  name_native: string | null;
  created_at: string;
  updated_at: string;
}

export interface Language {
  id: string;
  code: string;
  name: string;
  name_native: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Format {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Technology {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Genre {
  id: string;
  code: string;
  name: string;
  parent_id: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface AgeRating {
  id: string;
  country_id: string | null;
  code: string;
  name: string;
  min_age: number | null;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  // Relations
  country?: Country;
}

// ============================================================================
// TAG TABLES
// ============================================================================

export interface CinemaTag {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MovieTag {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SessionTag {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CINEMA TABLES
// ============================================================================

export interface CinemaGroup {
  id: string;
  name: string;
  slug: string;
  country_id: string | null;
  website: string | null;
  logo_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  country?: Country;
  cinemas?: Cinema[];
}

export interface Cinema {
  id: string;
  cinema_group_id: string | null;
  name: string;
  slug: string;
  country_id: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  screen_count: number;
  is_active: boolean;
  parser_type: string | null;
  parser_config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Relations
  cinema_group?: CinemaGroup;
  country?: Country;
  tags?: CinemaTag[];
}

// ============================================================================
// PEOPLE TABLES
// ============================================================================

export interface Person {
  id: string;
  name: string;
  slug: string;
  birth_date: string | null;
  death_date: string | null;
  birth_place: string | null;
  biography: string | null;
  photo_url: string | null;
  imdb_id: string | null;
  tmdb_id: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// MOVIE TABLES
// ============================================================================

export interface MovieL0 {
  id: string;
  original_title: string;
  slug: string;
  production_year: number | null;
  runtime_minutes: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  trailer_url: string | null;
  imdb_id: string | null;
  tmdb_id: number | null;
  imdb_rating: number | null;
  tmdb_rating: number | null;
  status: MovieStatus;
  is_verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  countries?: Country[];
  genres?: Genre[];
  tags?: MovieTag[];
  cast?: MovieCast[];
  crew?: MovieCrew[];
  companies?: MovieCompany[];
  images?: MovieImage[];
  l1_entries?: MovieL1[];
  l2_entries?: MovieL2[];
}

export interface MovieCast {
  id: string;
  movie_id: string;
  person_id: string;
  character_name: string | null;
  billing_order: number;
  created_at: string;
  // Relations
  person?: Person;
}

export interface MovieCrew {
  id: string;
  movie_id: string;
  person_id: string;
  role: string;
  department: string | null;
  credit_order: number;
  created_at: string;
  // Relations
  person?: Person;
}

export interface MovieCompany {
  id: string;
  movie_id: string;
  company_name: string;
  company_country_id: string | null;
  role: string;
  created_at: string;
  // Relations
  country?: Country;
}

export interface MovieImage {
  id: string;
  movie_id: string;
  image_url: string;
  image_type: 'still' | 'poster' | 'backdrop' | 'logo';
  width: number | null;
  height: number | null;
  display_order: number;
  created_at: string;
}

export interface MovieL1 {
  id: string;
  movie_l0_id: string;
  language_id: string;
  title: string;
  plot: string | null;
  release_date: string | null;
  runtime_minutes: number | null;
  age_rating_id: string | null;
  tagline: string | null;
  keywords: string[] | null;
  created_at: string;
  updated_at: string;
  // Relations
  movie_l0?: MovieL0;
  language?: Language;
  age_rating?: AgeRating;
  sync_voices?: SyncVoice[];
}

export interface SyncVoice {
  id: string;
  movie_l1_id: string;
  person_id: string | null;
  person_name: string | null;
  original_character: string | null;
  created_at: string;
  // Relations
  person?: Person;
}

export interface MovieL2 {
  id: string;
  movie_l0_id: string;
  edition_title: string | null;
  format_id: string | null;
  technology_id: string | null;
  audio_language_id: string | null;
  subtitle_language_id: string | null;
  subtitle_language_2_id: string | null;
  is_original_version: boolean;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  movie_l0?: MovieL0;
  format?: Format;
  technology?: Technology;
  audio_language?: Language;
  subtitle_language?: Language;
  subtitle_language_2?: Language;
}

// ============================================================================
// SESSION TABLES
// ============================================================================

export interface Session {
  id: string;
  movie_l2_id: string;
  cinema_id: string;
  screen_name: string | null;
  show_date: string;
  show_time: string;
  end_time: string | null;
  price: number | null;
  currency: string;
  booking_url: string | null;
  notes: string | null;
  is_cancelled: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  movie_l2?: MovieL2;
  cinema?: Cinema;
  tags?: SessionTag[];
}

// ============================================================================
// USER TABLES
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserCinemaPermission {
  user_id: string;
  cinema_id: string;
  can_edit: boolean;
  can_manage_sessions: boolean;
  created_at: string;
}

export interface UserCinemaGroupPermission {
  user_id: string;
  cinema_group_id: string;
  can_edit: boolean;
  can_manage_sessions: boolean;
  created_at: string;
}

// ============================================================================
// IMPORT/EXPORT TABLES
// ============================================================================

export interface ImportJob {
  id: string;
  user_id: string | null;
  cinema_id: string | null;
  file_name: string | null;
  file_url: string | null;
  file_type: string | null;
  parser_type: string | null;
  status: ImportStatus;
  total_records: number;
  processed_records: number;
  success_records: number;
  error_records: number;
  errors: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  // Relations
  user?: UserProfile;
  cinema?: Cinema;
}

export interface ImportTitle {
  id: string;
  import_title: string;
  movie_l0_id: string | null;
  cinema_id: string | null;
  confidence: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  movie_l0?: MovieL0;
  cinema?: Cinema;
}

export interface ExportClient {
  id: string;
  name: string;
  slug: string;
  contact_email: string | null;
  contact_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  templates?: ExportTemplate[];
}

export interface ExportTemplate {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  format: 'xml' | 'json' | 'csv';
  template_content: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  client?: ExportClient;
}

export interface ExportJob {
  id: string;
  user_id: string | null;
  client_id: string | null;
  template_id: string | null;
  status: ExportStatus;
  date_from: string | null;
  date_to: string | null;
  filters: Record<string, unknown> | null;
  output_url: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  // Relations
  user?: UserProfile;
  client?: ExportClient;
  template?: ExportTemplate;
}

export interface ExportLanguageMapping {
  id: string;
  client_id: string;
  language_id: string;
  export_code: string;
  export_name: string | null;
  created_at: string;
  // Relations
  client?: ExportClient;
  language?: Language;
}

export interface ExportTitleMapping {
  id: string;
  client_id: string;
  movie_l0_id: string;
  export_title: string;
  created_at: string;
  // Relations
  client?: ExportClient;
  movie_l0?: MovieL0;
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Relations
  user?: UserProfile;
}

// ============================================================================
// COMPOSITE TYPES FOR API RESPONSES
// ============================================================================

export interface MovieWithDetails extends MovieL0 {
  countries: Country[];
  genres: Genre[];
  tags: MovieTag[];
  cast: (MovieCast & { person: Person })[];
  crew: (MovieCrew & { person: Person })[];
  companies: MovieCompany[];
  images: MovieImage[];
  l1_entries: (MovieL1 & { language: Language; age_rating: AgeRating | null })[];
  l2_entries: (MovieL2 & {
    format: Format | null;
    technology: Technology | null;
    audio_language: Language | null;
    subtitle_language: Language | null;
  })[];
}

export interface SessionWithDetails extends Session {
  movie_l2: MovieL2 & {
    movie_l0: MovieL0 & {
      l1_entries: MovieL1[];
    };
    format: Format | null;
    technology: Technology | null;
    audio_language: Language | null;
    subtitle_language: Language | null;
  };
  cinema: Cinema & {
    cinema_group: CinemaGroup | null;
  };
  tags: SessionTag[];
}

export interface CinemaWithDetails extends Omit<Cinema, 'cinema_group' | 'country' | 'tags'> {
  cinema_group: CinemaGroup | null;
  country: Country | null;
  tags: CinemaTag[];
}

// ============================================================================
// FORM INPUT TYPES
// ============================================================================

export interface MovieL0Input {
  original_title: string;
  production_year?: number | null;
  runtime_minutes?: number | null;
  poster_url?: string | null;
  backdrop_url?: string | null;
  trailer_url?: string | null;
  imdb_id?: string | null;
  tmdb_id?: number | null;
  status?: MovieStatus;
  notes?: string | null;
  country_ids?: string[];
  genre_ids?: string[];
  tag_ids?: string[];
}

export interface MovieL1Input {
  movie_l0_id: string;
  language_id: string;
  title: string;
  plot?: string | null;
  release_date?: string | null;
  runtime_minutes?: number | null;
  age_rating_id?: string | null;
  tagline?: string | null;
  keywords?: string[];
}

export interface MovieL2Input {
  movie_l0_id: string;
  edition_title?: string | null;
  format_id?: string | null;
  technology_id?: string | null;
  audio_language_id?: string | null;
  subtitle_language_id?: string | null;
  subtitle_language_2_id?: string | null;
  is_original_version?: boolean;
  notes?: string | null;
}

export interface SessionInput {
  movie_l2_id: string;
  cinema_id: string;
  screen_name?: string | null;
  show_date: string;
  show_time: string;
  price?: number | null;
  currency?: string;
  booking_url?: string | null;
  notes?: string | null;
  tag_ids?: string[];
}

export interface CinemaInput {
  cinema_group_id?: string | null;
  name: string;
  country_id?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logo_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  screen_count?: number;
  parser_type?: string | null;
  parser_config?: Record<string, unknown> | null;
  tag_ids?: string[];
}
