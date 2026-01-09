# Claude.md - AI Assistant Guide for CAT Project

This document provides context for AI assistants working on the Cinema Automation Tool (CAT) project.

## Project Context

CAT is a cinema program management system that automates the collection, processing, and distribution of cinema program data for newspapers and websites in Luxembourg. It's built for miir.concepts, a company that provides graphical designs of cinema schedules to clients like Lëtzebuerger Wort, RTL, and Telecran.

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with RLS
- **Styling**: Tailwind CSS + shadcn/ui
- **Testing**: Vitest + React Testing Library
- **Deployment**: Netlify

## Key Concepts

### Movie Data Layers

The system uses a three-layer architecture for movies:

1. **L0 (Core Info)**: Universal movie data
   - Original title, genre, production year/country/company
   - Cast, director, screenplay, music
   - Trailer URL, poster, stills

2. **L1 (Localized Info)**: Per-language data
   - Localized title, release date, duration
   - Age rating, sync voices, plot
   - Languages: LU, FR, BE, DE, EN

3. **L2 (Edition Info)**: Specific variants
   - Format (2D, 3D, IMAX)
   - Technology (Atmos, 4DX)
   - Audio language, subtitles

### Sessions

A session links an L2 movie edition to a cinema at a specific date/time. Sessions are the core unit for scheduling and export.

### Verification

Movies have a `verified` status. Verified movies have been human-validated for accuracy. Unverified movies may have incomplete or incorrect data.

## Database Schema Key Tables

- `cinema_groups` - Parent organizations (e.g., Kinepolis, Utopia)
- `cinemas` - Individual cinema locations
- `movies_l0` - Core movie information
- `movies_l1` - Localized movie information
- `movies_l2` - Movie editions/variants
- `sessions` - Cinema showings
- `formats` - 2D, 3D, IMAX, etc.
- `technologies` - Atmos, 4DX, etc.
- `languages` - Language definitions
- `genres` - Movie genres
- `age_ratings` - Age classification systems
- Various tag tables for flexible categorization

## Code Conventions

### File Naming
- React components: PascalCase (`MovieCard.tsx`)
- Utilities: camelCase (`formatDate.ts`)
- Types: PascalCase with `.types.ts` suffix
- API routes: kebab-case directories

### Component Structure
```typescript
// Prefer named exports
export function ComponentName({ prop }: Props) {
  // Hooks first
  const [state, setState] = useState()

  // Effects
  useEffect(() => {}, [])

  // Handlers
  const handleClick = () => {}

  // Render
  return <div>...</div>
}
```

### Database Queries
- Use Supabase client from `@/lib/supabase`
- Server components: use `createServerClient`
- Client components: use `createBrowserClient`
- Always handle errors with try/catch

### API Routes
```typescript
// app/api/[resource]/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = createServerClient()
  // ...
  return NextResponse.json({ data })
}
```

## Important Paths

- `/src/app/(dashboard)` - Protected admin pages
- `/src/app/(auth)` - Login/register pages
- `/src/app/api` - API endpoints
- `/src/components/ui` - Base shadcn components
- `/src/lib/parsers` - Excel/XML parsers
- `/supabase/migrations` - Database migrations

## Common Tasks

### Adding a New Parser
1. Create parser in `/src/lib/parsers/[cinema-name].ts`
2. Implement `Parser` interface
3. Register in `/src/lib/parsers/index.ts`
4. Add tests in `/tests/parsers/`

### Adding a New Export Format
1. Create exporter in `/src/lib/exporters/[format].ts`
2. Implement `Exporter` interface
3. Register in client configuration

### Creating Database Migration
```bash
npm run db:migration:create [migration_name]
```

## Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:
- `IMDB_API_KEY`
- `TMDB_API_KEY`

## Testing Guidelines

- Unit tests for utilities and parsers
- Integration tests for API routes
- Component tests for complex UI
- Test files adjacent to source: `Component.test.tsx`

## Security Considerations

- All database access through RLS policies
- API routes validate authentication
- File uploads validated and sanitized
- No secrets in client-side code
- CSRF protection enabled

## Common Gotchas

1. Movie IDs reference L0, not L2 - editions have separate IDs
2. Session times are stored in UTC, display in local timezone
3. Parser configurations are per-cinema, stored in database
4. Export templates support Handlebars syntax
5. File uploads go to Supabase Storage, not local filesystem
