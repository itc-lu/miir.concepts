// CAT Cinema Automation Tool - Database Types
// Auto-generated types for Supabase tables

// Role hierarchy:
// - global_admin:   Full access to everything
// - internal_admin: CRUD users, movies, sessions, reference tables (age_rating, genre, cinema_group, cinema, etc.)
// - internal_user:  CRUD movies and sessions only
// - external:       Create sessions manually for linked cinemas only
export type UserRole = 'global_admin' | 'internal_admin' | 'internal_user' | 'external';
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
  week_start_day: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  display_name: string | null; // Computed: "[CODE] Name"
  created_at: string;
  updated_at: string;
}

// Flag type enum matching database
export type FlagType =
  | 'releases_of_the_week'
  | 'previews_of_the_week'
  | 'special_screenings_of_the_week'
  | 'festival_screenings'
  | 'movie_of_the_week'
  | 'movie_of_the_day'
  | 'open_air';

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
  is_basic_flag: boolean;
  is_superior_flag: boolean;
  flag_type: FlagType | null;
  created_at: string;
  updated_at: string;
}

// Alias for clarity - SessionTag is now used as Cinema Flag
export type CinemaFlag = SessionTag;

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
  timezone: string; // e.g., "Europe/Luxembourg"
  week_start_day_override: number | null; // Override country's week start day
  missing_info: string | null; // Notes about missing data
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
  duration_hours: number | null; // Runtime as decimal hours (e.g., 2.5 = 2h 30m)
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
  start_time: string; // Computed: show_date + show_time
  end_time: string | null;
  price: number | null;
  currency: string;
  booking_url: string | null;
  notes: string | null;
  is_cancelled: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  movie_l2?: MovieL2;
  cinema?: Cinema;
  tags?: SessionTag[];
}

// ============================================================================
// SCREENING HIERARCHY (per requirements)
// ============================================================================

// Cinema Screening - represents a week of showings for a movie edition
export interface Screening {
  id: string;
  cinema_id: string;
  movie_l2_id: string;
  format_id: string | null;
  start_week_day: string; // First day of screening week (DATE)
  movie_of_the_week: boolean;
  movie_of_the_day: boolean;
  day_flag_added_date: string | null; // When "movie of the day" was assigned
  state: 'to_verify' | 'verified';
  missing_info: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  cinema?: Cinema;
  movie_l2?: MovieL2;
  format?: Format;
  flags?: SessionTag[];
  session_days?: SessionDay[];
}

// Cinema Session Day - one day within a screening week
export interface SessionDay {
  id: string;
  screening_id: string;
  date: string;
  created_at: string;
  // Relations
  screening?: Screening;
  session_times?: SessionTime[];
}

// Cinema Session Time - individual showing time
export interface SessionTime {
  id: string;
  session_day_id: string;
  time_float: number; // Time as decimal hours (e.g., 14.5 = 14:30)
  start_datetime: string | null;
  end_datetime: string | null;
  created_at: string;
  // Relations
  session_day?: SessionDay;
}

// ============================================================================
// MOVIE COUNTRY WEEK TRACKING
// ============================================================================

export interface MovieCountryWeek {
  id: string;
  movie_l2_id: string;
  country_id: string;
  national_start_date: string;
  weeks_showing: number;
  created_at: string;
  updated_at: string;
  // Relations
  movie_l2?: MovieL2;
  country?: Country;
}

// ============================================================================
// FLAG AUTOMATION
// ============================================================================

export interface FlagDateConfig {
  id: string;
  movie_l2_id: string;
  cinema_group_id: string | null;
  cinema_id: string | null;
  movie_of_the_day_date: string | null;
  movie_of_the_week_date: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  movie_l2?: MovieL2;
  cinema_group?: CinemaGroup;
  cinema?: Cinema;
}

// ============================================================================
// EXPORT MAPPINGS
// ============================================================================

export interface ExportTechnologyMapping {
  id: string;
  export_client_id: string;
  format_id: string | null;
  technology_id: string | null;
  export_code: string;
  created_at: string;
  // Relations
  export_client?: ExportClient;
  format?: Format;
  technology?: Technology;
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
  can_view_sessions: boolean;
  can_create_sessions: boolean;
  can_edit_sessions: boolean;
  can_delete_sessions: boolean;
  created_at: string;
}

export interface UserCinemaGroupPermission {
  user_id: string;
  cinema_group_id: string;
  can_edit: boolean;
  can_manage_sessions: boolean;
  can_view_sessions: boolean;
  can_create_sessions: boolean;
  can_edit_sessions: boolean;
  can_delete_sessions: boolean;
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
  timezone?: string;
  week_start_day_override?: number | null;
  missing_info?: string | null;
  parser_type?: string | null;
  parser_config?: Record<string, unknown> | null;
  tag_ids?: string[];
}

// ============================================================================
// SCREENING INPUT TYPES
// ============================================================================

export interface ScreeningInput {
  cinema_id: string;
  movie_l2_id: string;
  format_id?: string | null;
  start_week_day: string;
  flag_ids?: string[];
}

export interface SessionTimeInput {
  session_day_id: string;
  time_float: number; // e.g., 14.5 for 14:30
}

export interface FlagDateConfigInput {
  movie_l2_id: string;
  cinema_group_id?: string | null;
  cinema_id?: string | null;
  movie_of_the_day_date?: string | null;
  movie_of_the_week_date?: string | null;
}

// ============================================================================
// PARSER SYSTEM TYPES
// ============================================================================

export type ImportConflictState = 'to_verify' | 'verified' | 'processed' | 'skipped';

export interface Parser {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  supported_formats: string[];
  config_schema: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LanguageMappingConfig {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  lines?: LanguageMappingLine[];
}

export interface LanguageMappingLine {
  id: string;
  config_id: string;
  version_string: string;
  spoken_language_id: string | null;
  subtitle_language_ids: string[];
  notes: string | null;
  created_at: string;
  // Relations
  spoken_language?: Language;
}

export interface ImportConflictMovie {
  id: string;
  cinema_group_id: string | null;
  cinema_id: string | null;
  import_job_id: string | null;
  parser_id: string | null;
  import_title: string;
  movie_name: string | null;
  director: string | null;
  year_of_production: number | null;
  country_of_production: string | null;
  plot_description: string | null;
  matched_movie_l0_id: string | null;
  state: ImportConflictState;
  missing_info: string | null;
  is_created: boolean;
  created_at: string;
  updated_at: string;
  import_text: string | null;
  // Relations
  cinema_group?: CinemaGroup;
  cinema?: Cinema;
  parser?: Parser;
  matched_movie?: MovieL0;
  editions?: ImportConflictEdition[];
  sessions?: ImportConflictSession[];
}

export interface ImportConflictEdition {
  id: string;
  conflict_movie_id: string;
  title: string | null;
  full_title: string | null;
  language_code: string | null;
  language_id: string | null;
  duration_minutes: number | null;
  duration_text: string | null;
  director: string | null;
  year_of_production: number | null;
  country_of_production: string | null;
  countries_available: string[] | null;
  subtitle_languages: string[] | null;
  subtitle_language_ids: string[];
  tags: string[] | null;
  format_codes: string[] | null;
  format_id: string | null;
  technology_id: string | null;
  age_rating: string | null;
  age_rating_id: string | null;
  plot_description: string | null;
  version_string: string | null;
  state: ImportConflictState;
  missing_info: string | null;
  matched_movie_l2_id: string | null;
  created_at: string;
  updated_at: string;
  import_text: string | null;
  // Relations
  language?: Language;
  format?: Format;
  technology?: Technology;
  age_rating_obj?: AgeRating;
  matched_edition?: MovieL2;
}

export interface ImportConflictSession {
  id: string;
  conflict_movie_id: string;
  conflict_edition_id: string | null;
  cinema_id: string;
  screening_datetime: string;
  screening_date: string | null;
  time_float: number | null;
  title: string | null;
  language_code: string | null;
  duration_minutes: number | null;
  format_code: string | null;
  start_week_day: string | null;
  state: ImportConflictState;
  missing_info: string | null;
  created_at: string;
  updated_at: string;
  import_text: string | null;
  // Relations
  cinema?: Cinema;
  conflict_movie?: ImportConflictMovie;
  conflict_edition?: ImportConflictEdition;
}

// ============================================================================
// PARSER DATA TYPES (for parsed Excel data)
// ============================================================================

export interface ParsedShowTime {
  date: Date;
  time: string; // "14:30" format
  timeFloat: number; // 14.5 format
  datetime: Date;
}

export interface ParsedFilmData {
  importTitle: string; // Full string from Excel
  movieName: string;
  movieEdition: string | null;
  language: string | null;
  languageCode: string | null;
  subtitleLanguages: string[];
  formatTechnology: {
    formatStr: string | null;
    formatObj: Format | null;
    technologyObj: Technology | null;
  };
  duration: string | null; // "2:42" format
  durationMinutes: number | null;
  ageRating: string | null;
  director: string | null;
  year: number | null;
  productionCountry: string | null;
  availableCountries: string[];
  versionString: string | null;
  tags: string[];
  description: string | null;
  startWeekDate: Date | null;
  screeningShows: ParsedShowTime[];
}

export interface ParsedSheetResult {
  sheetName: string;
  films: ParsedFilmData[];
  cinema?: Cinema;
  dateRange?: {
    start: Date;
    end: Date;
  };
  errors: string[];
}

export interface ParserResult {
  success: boolean;
  sheets: ParsedSheetResult[];
  errors: string[];
  warnings: string[];
}

// ============================================================================
// IMPORT WORKFLOW TYPES
// ============================================================================

export interface ImportOptions {
  createMoviesAutomatically: boolean;
  cleanupOldData: boolean;
  cleanupDate: string | null;
  previewOnly: boolean;
}

export interface ImportSummary {
  totalMovies: number;
  newMovies: number;
  updatedMovies: number;
  totalEditions: number;
  newEditions: number;
  updatedEditions: number;
  totalScreenings: number;
  newScreenings: number;
  updatedScreenings: number;
  totalSessions: number;
  newSessions: number;
  conflicts: number;
  errors: string[];
  warnings: string[];
}
