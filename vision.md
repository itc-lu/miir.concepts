# CAT - Cinema Automation Tool: Vision Document

## Executive Summary

The Cinema Automation Tool (CAT) is a transformative initiative to modernize cinema program data management for Luxembourg's media landscape. By automating the collection, processing, and distribution of cinema schedules, CAT will dramatically reduce manual effort, minimize errors, and enable miir.concepts to scale their operations efficiently.

## Background

### Current State

miir.concepts provides weekly and monthly graphical cinema program schedules to prominent Luxembourg media outlets including:
- Lëtzebuerger Wort
- RTL
- Telecran
- Various other newspapers and websites

The current workflow involves:
1. Receiving cinema data via email in various formats (XLS, PDF)
2. Manual processing and data entry into an SQL database
3. Data enrichment through manual lookup on IMDB and other sources
4. Export to XML for import into InDesign
5. Custom design layouts per client

**Pain Points:**
- Time-consuming manual data entry
- Inconsistent data formats from providers
- Error-prone manual processes
- Limited scalability
- Difficulty maintaining data consistency

### Future Vision

CAT will transform this workflow into a streamlined, largely automated process:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA ACQUISITION                              │
├─────────────────┬─────────────────┬─────────────────┬───────────────┤
│  API Integration│  Email Parsing  │  Manual Upload  │ Manual Entry  │
└────────┬────────┴────────┬────────┴────────┬────────┴───────┬───────┘
         │                 │                 │                │
         └─────────────────┴─────────────────┴────────────────┘
                                    │
                          ┌─────────▼─────────┐
                          │   UNIFIED PARSER  │
                          │  (10+ Cinema-     │
                          │   specific rules) │
                          └─────────┬─────────┘
                                    │
                          ┌─────────▼─────────┐
                          │  CENTRAL DATABASE │
                          │  (L0/L1/L2 Model) │
                          └─────────┬─────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
    ┌─────────▼─────────┐ ┌────────▼────────┐ ┌─────────▼─────────┐
    │ DATA ENRICHMENT   │ │ SESSION MGMT    │ │ CUSTOM EXPORTS    │
    │ (IMDB, TMDB)      │ │ (Wizard-based)  │ │ (Per-client XML)  │
    └───────────────────┘ └─────────────────┘ └───────────────────┘
```

## Core Objectives

### 1. Automation First
- Minimize manual data entry through intelligent parsing
- Auto-enrich movie data from trusted sources
- Scheduled automated exports to clients

### 2. Data Quality
- Three-layer movie model ensures consistency
- Verification workflow for data accuracy
- Deduplication and conflict resolution

### 3. Flexibility
- Support multiple input formats and sources
- Customizable export templates per client
- Extensible parser architecture for new cinemas

### 4. Scalability
- Handle growing number of cinemas and clients
- Cloud-native architecture
- API-first design for integrations

### 5. User Experience
- Intuitive web interface for operators
- Guided wizards for complex tasks
- Real-time validation and feedback

## Data Model

### Three-Layer Movie Architecture

The system represents movies in three distinct layers, allowing for efficient data management while supporting localization and format variations.

#### Layer 0 (L0) - Core Movie Information
Universal, language-independent information about a film.

| Field | Description |
|-------|-------------|
| Original Title | The film's original release title |
| Genre | Primary and secondary genres |
| Production Year | Year of original release |
| Production Country | Country/countries of production |
| Production Company | Studio/production company |
| Cast | Main actors (linked to People table) |
| Director | Film director(s) |
| Screenplay | Screenwriter(s) |
| Music | Composer(s) |
| Cinematography | Director of Photography |
| Trailer URL | Link to official trailer |
| Poster | Primary poster image |
| Stills | Gallery of film stills |
| IMDB ID | IMDB reference |
| TMDB ID | TMDB reference |

#### Layer 1 (L1) - Localized Information
Market-specific information, one record per language/region.

| Field | Description |
|-------|-------------|
| Language | LU, FR, DE, EN, etc. |
| Title | Localized release title |
| Release Date | Regional release date |
| Duration | Runtime in minutes |
| Age Rating | Regional age classification |
| Sync Voices | Voice actors for dubbed versions |
| Plot | Localized synopsis |

#### Layer 2 (L2) - Edition/Variant Information
Specific presentations of a film.

| Field | Description |
|-------|-------------|
| Edition Title | e.g., "IMAX 3D Version" |
| Format | 2D, 3D, IMAX, etc. |
| Technology | Atmos, 4DX, etc. |
| Audio Language | Primary audio language |
| Subtitles | Subtitle language(s) |

### Session Model

Sessions link L2 movie editions to cinema screens at specific times.

| Field | Description |
|-------|-------------|
| Movie Edition (L2) | Reference to movie variant |
| Cinema | Venue showing the film |
| Screen | Specific auditorium |
| Date | Showing date |
| Time | Showing time |
| Tags | Special attributes (preview, last chance, etc.) |

## User Roles & Permissions

### Super Admin
- Full system access
- User management
- System configuration
- All cinema access

### Admin
- Manage movies and sessions
- Run imports and exports
- Verify movie data
- Assigned cinema groups only

### Editor
- Create and edit sessions
- Basic movie editing
- Assigned cinemas only

### Viewer
- Read-only access
- Export generation
- Report viewing

## Key Workflows

### 1. Movie Import Workflow
```
Upload File → Parse → Match Existing Movies → Create/Update Records → Flag for Verification
```

### 2. Session Creation Workflow
```
Select Cinema → Search/Create Movie → Choose Edition → Set Date/Time → Add Tags → Confirm
```

### 3. Export Workflow
```
Select Client → Choose Date Range → Apply Filters → Generate XML → Download/Send
```

### 4. Verification Workflow
```
Review Movie → Check External Sources → Validate Fields → Mark Verified → Log Changes
```

## Technical Requirements

### Performance
- Page load < 2 seconds
- Import processing < 5 minutes for large files
- Export generation < 30 seconds

### Availability
- 99.5% uptime target
- Automated backups every 6 hours
- Disaster recovery < 4 hours

### Security
- Role-based access control
- Row-level security in database
- Encrypted data at rest and in transit
- Audit logging for all changes

### Compliance
- GDPR compliant data handling
- Data retention policies
- User consent management

## Parser Architecture

The system supports approximately 10 different parsers for various cinema providers:

### Parser Interface
```typescript
interface Parser {
  name: string
  supportedFormats: string[]
  parse(file: File): Promise<ParseResult>
  validate(data: ParseResult): ValidationResult
}
```

### Parser Implementations (Planned)
1. Kinepolis Parser (API + XLSX)
2. Utopia Parser (XLSX)
3. Ciné Utopia Parser (XLSX)
4. Caramba Parser (XML)
5. Kulturhuef Parser (XLSX)
6. Kinoler Parser (XLSX)
7. Prabbeli Parser (XLSX)
8. Orion Parser (XLSX)
9. Cinémathèque Parser (XML)
10. Generic Parser (configurable)

## Export Templates

Clients have different requirements for their export files:

### Template Variables
- Movie fields (all layers)
- Session information
- Cinema details
- Formatting options

### Client-Specific Configurations
- Language codes (EN vs English)
- Date formats
- Field mappings
- Included/excluded fields

## Integration Points

### Inbound
- Cinema provider APIs
- Email document reception
- File upload interface

### Outbound
- XML export files
- Client API delivery
- Email notifications

### External Data Sources
- IMDB API
- TMDB API
- Future: additional movie databases

## Success Metrics

### Efficiency Gains
- 80% reduction in manual data entry time
- 90% faster export generation
- 50% reduction in data errors

### Quality Improvements
- 95%+ data accuracy after verification
- Zero duplicate movie entries
- Complete movie metadata coverage

### User Satisfaction
- < 5 minute learning curve for basic operations
- < 3 clicks for common tasks
- Positive user feedback scores

## Roadmap

### Phase 1: Foundation
- Core database schema
- User authentication
- Basic CRUD operations
- Manual movie/session entry

### Phase 2: Import/Export
- Excel parser framework
- First 3 cinema parsers
- XML export engine
- Client template system

### Phase 3: Enrichment
- IMDB integration
- TMDB integration
- Verification workflow
- Data quality tools

### Phase 4: Automation
- Email document processing
- Scheduled imports
- Automated exports
- Notification system

### Phase 5: Advanced Features
- API endpoints for cinemas
- Advanced analytics
- Mobile-optimized interface
- Extended integrations

## Conclusion

CAT represents a significant modernization of miir.concepts' cinema program operations. By investing in this automated, scalable solution, the company will be positioned for growth while delivering higher quality data to their clients with reduced operational overhead.

The three-layer movie model, combined with flexible import/export capabilities, creates a robust foundation that can adapt to changing requirements from both cinema providers and media clients.
