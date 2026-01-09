# CAT - Cinema Automation Tool

A comprehensive cinema program management system built for miir.concepts to automate the collection, processing, and distribution of cinema program data for newspapers and websites in Luxembourg.

## Overview

CAT streamlines the management of cinema schedules by:
- Automating data collection from multiple sources (API, Email, Manual upload, Excel/XML parsing)
- Standardizing movie information across different cinema providers
- Enriching data with external sources (IMDB, TMDB)
- Exporting customized formats for various clients

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Hosting**: Netlify
- **Testing**: Vitest + React Testing Library
- **CI/CD**: GitHub Actions

## Architecture

### Data Layers

The system uses a three-layer movie architecture:

| Layer | Description | Fields |
|-------|-------------|--------|
| **L0** | Core movie information | Original title, Genre, Production year/country/company, Cast, Director, Screenplay, Music, Trailer, Poster, Stills |
| **L1** | Localized information | Title, Release date, Duration, Age rating, Sync voices, Plot (per language: LU, FR, BE, DE) |
| **L2** | Edition/variant information | Format, Technology, Language, Subtitles |

### Data Flow

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ API Integration │  │ XLSX via Email  │  │ Manual Upload   │  │ Manual Entry    │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │                    │
         └────────────────────┴────────────────────┴────────────────────┘
                                       │
                              ┌────────▼────────┐
                              │  Data Parsing   │
                              └────────┬────────┘
                                       │
                              ┌────────▼────────┐
                              │ Data Gathering  │
                              └────────┬────────┘
                                       │
                              ┌────────▼────────┐
                              │   CAT Module    │
                              └────────┬────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
           ┌────────▼────────┐ ┌───────▼───────┐ ┌───────▼───────┐
           │ Data Enhancement│ │  Data Export  │ │   Sessions    │
           │  (IMDB/TMDB)   │ │    (XML)      │ │  Management   │
           └─────────────────┘ └───────────────┘ └───────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

```bash
# Clone the repository
git clone https://github.com/itc-lu/miir.concepts.git
cd miir.concepts

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://feqbvqhudlgjfwsijhks.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
IMDB_API_KEY=your_imdb_api_key
TMDB_API_KEY=your_tmdb_api_key
```

## Project Structure

```
miir.concepts/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (dashboard)/       # Protected dashboard pages
│   │   ├── api/               # API routes
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   │   ├── ui/               # Base UI components
│   │   ├── forms/            # Form components
│   │   ├── tables/           # Data table components
│   │   └── wizards/          # Multi-step wizards
│   ├── lib/                   # Utility libraries
│   │   ├── supabase/         # Supabase client
│   │   ├── parsers/          # Data parsers
│   │   └── validators/       # Data validators
│   ├── hooks/                 # Custom React hooks
│   ├── types/                 # TypeScript types
│   └── utils/                 # Utility functions
├── supabase/
│   ├── migrations/           # Database migrations
│   └── seed.sql             # Seed data
├── tests/                    # Test files
├── .github/
│   └── workflows/           # CI/CD pipelines
└── public/                  # Static assets
```

## Features

### Movie Management
- Three-layer movie structure (L0, L1, L2)
- Movie verification workflow
- Automatic data enrichment from IMDB/TMDB
- Support for multiple languages and formats

### Session Management
- Link movies to cinemas with date/time
- Guided wizard for session creation
- Bulk session import
- Session tagging system

### Data Import
- Excel (.xlsx) file parsing
- XML file parsing
- API integration for automated data collection
- Email-based document reception

### Export
- Customized XML exports per client
- Configurable export templates
- Scheduled automated exports

### User Management
- Role-based access control
- Cinema-specific permissions
- Activity logging

## API Documentation

API documentation is available at `/api/docs` when running the development server.

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Deployment

The application is automatically deployed to Netlify on push to the main branch.

### Manual Deployment

```bash
# Build the application
npm run build

# Deploy to Netlify
netlify deploy --prod
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Write/update tests
4. Submit a pull request

## License

Proprietary - miir.concepts © 2024

## Support

For support, contact: support@miir.concepts
