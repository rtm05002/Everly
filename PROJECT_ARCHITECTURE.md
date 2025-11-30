# Everly Platform - Project Architecture & Structure Documentation

## Project Overview

**Everly** is a Next.js-based engagement and retention platform designed for Whop communities. It provides creators with tools to manage member engagement, automate nudges, track analytics, manage bounties, and implement onboarding flows. The platform integrates with Whop's API for community data and uses Supabase as the primary database backend.

## Technology Stack

### Core Framework & Libraries
- **Next.js 15.5.6** (App Router) - React framework with server-side rendering
- **React 19.2.0** - UI library
- **TypeScript 5.9.3** - Type safety
- **Tailwind CSS 3.4.14** - Styling with custom theme
- **Radix UI** - Accessible component primitives (comprehensive set)
- **Zod 4.1.12** - Runtime type validation and schema definitions

### Backend & Database
- **Supabase** - PostgreSQL database with Row Level Security (RLS)
- **pgvector** - Vector embeddings for AI/RAG functionality
- **OpenAI API** - Embeddings generation and AI features
- **@whop/sdk** - Whop API integration for community data

### Additional Libraries
- **Framer Motion** - Animations
- **Recharts** - Data visualization
- **React Hook Form** - Form management
- **date-fns** - Date utilities
- **jsonwebtoken** - JWT authentication
- **Sentry** - Error monitoring (configured but disabled)

## Project Structure

```
everly/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (marketing)/       # Marketing pages (if any)
│   │   ├── admin/             # Admin-only pages
│   │   │   └── nudges/        # Nudge logs admin interface
│   │   ├── ai-assistant/      # AI Assistant feature
│   │   │   ├── actions.ts     # Server actions for AI config
│   │   │   ├── config-form.tsx      # AI configuration UI
│   │   │   ├── nudge-recipes-form.tsx  # Nudge recipe management
│   │   │   ├── preview-nudges.tsx     # Preview nudge execution
│   │   │   └── run-nudges-action.ts   # Execute nudges
│   │   ├── api/               # API routes (48 files)
│   │   │   ├── admin/         # Admin endpoints
│   │   │   ├── announcements/ # Announcement management
│   │   │   ├── assistant/     # AI assistant endpoints
│   │   │   ├── auth/          # Authentication (Whop OAuth)
│   │   │   ├── debug/         # Development/debug endpoints
│   │   │   ├── hub/           # Hub-specific endpoints
│   │   │   ├── nudges/        # Nudge execution endpoints
│   │   │   ├── webhooks/      # Webhook handlers (Whop)
│   │   │   └── widget/        # Widget session management
│   │   ├── announcements/     # Announcement management UI
│   │   ├── bounties/          # Bounty management pages
│   │   ├── insights/           # Analytics/insights dashboard
│   │   ├── members/           # Member management
│   │   ├── onboarding/       # Onboarding flow editor
│   │   ├── overview/          # Main dashboard
│   │   ├── settings/          # Settings page
│   │   └── widget/            # Public-facing widget
│   ├── components/            # Reusable React components
│   │   ├── ui/                # 58 UI primitives (Radix-based)
│   │   ├── onboarding/        # Onboarding-specific components
│   │   ├── widget/            # Widget components
│   │   ├── sources/           # Source management UI
│   │   └── charts/            # Chart components
│   ├── lib/                   # Shared utilities and business logic
│   │   ├── env.ts             # Environment variable validation (Zod)
│   │   ├── types.ts           # Core TypeScript types
│   │   ├── nudges.ts          # Nudge evaluation logic
│   │   ├── whop.ts            # Whop API client wrapper
│   │   ├── embed.ts           # OpenAI embeddings generation
│   │   ├── auth.ts            # Authentication utilities
│   │   ├── jwt.ts             # JWT handling
│   │   ├── supabase-*.ts      # Supabase client instances (browser/server)
│   │   └── [other utilities]  # Various helper functions
│   └── server/                # Server-side code
│       ├── db.ts              # Supabase service client
│       ├── data-adapter.ts    # Data abstraction layer (multi-backend)
│       ├── adapters/          # Backend adapters (Whop, mock, etc.)
│       ├── whop/              # Whop integration logic
│       │   └── map-events.ts  # Map Whop webhooks to DB events
│       ├── nudges/            # Nudge execution engine
│       └── onboarding/        # Onboarding flow logic
├── supabase/                  # Database migrations and schemas
│   ├── nudges.sql             # Nudge system schema
│   ├── onboarding.sql         # Onboarding flows schema
│   ├── whop_docs.sql          # Whop document indexing
│   ├── ai_content_index.sql   # AI content indexing (RAG)
│   ├── policies.sql          # Row Level Security policies
│   └── [migrations]           # Versioned migrations (01-07)
├── scripts/                   # Utility scripts
│   ├── seed.mjs               # Seed file-based data
│   ├── seed-supabase.mjs      # Seed Supabase database
│   ├── migrate-to-supabase.mjs # Migration script
│   └── whop-seed.mjs          # Seed Whop webhooks
├── data/                      # File-based data storage (legacy/mock)
│   └── *.json                 # JSON files for mock data
└── docs/                      # Documentation files
```

## Architecture Patterns

### 1. Data Adapter Pattern
The application uses a **data adapter pattern** to support multiple backends:
- **File Backend** (`file`) - JSON file storage (development/mock)
- **Supabase Backend** (`db`) - Production PostgreSQL database
- **Whop Backend** (`whop`) - Direct Whop API integration
- **Whop Emulated** (`whop-emulated`) - Whop API with local caching

Selection is controlled by `DATA_BACKEND` environment variable. The adapter interface (`DataAdapter`) provides:
- `getStats(range)` - Analytics with time ranges
- `listBounties()` - Bounty management
- `listMembers()` - Member listing
- `recentEvents()` - Activity feed

### 2. Multi-Tenant Architecture
- **Hub-based isolation**: All data is scoped to `hub_id`
- **Row Level Security (RLS)**: Supabase RLS policies enforce tenant isolation
- **JWT-based auth**: Custom JWT tokens contain `hub_id`, `role`, `member_id`
- **Role-based access**: `creator`, `moderator`, `member` roles

### 3. Feature Flags
Environment-based feature flags control functionality:
- `FEATURE_NUDGES` - Enable/disable nudge system
- `FEATURE_ONBOARDING` - Enable/disable onboarding flows
- `NUDGES_ENABLED` - Runtime nudge execution
- `WHOP_SYNC_ENABLED` - Whop data synchronization
- `ENABLE_URL_FETCHER` - URL content fetching for RAG

## Core Features

### 1. AI Assistant & Nudges System
**Purpose**: Automated member engagement through configurable triggers

**Database Schema**:
- `nudge_recipes` - Trigger definitions, targeting, message templates
- `nudge_runs` - Execution history
- `nudge_messages` - Individual messages sent with deduplication
- `member_preferences` - Member opt-out/preference settings

**Key Features**:
- **Trigger Types**: `inactive_days`, `viewed_bounty_not_completed`, `near_deadline`, `first_completion`, `new_member_joined`
- **Targeting**: By tiers, cohorts (New/Lurker/Champion), tags
- **Frequency Control**: Cooldown days, max per week
- **Do Not Disturb**: Time-based windows
- **Channels**: DM, email, webhook
- **Deduplication**: Prevents duplicate nudges via `dedupe_key`

**Code Locations**:
- `src/app/ai-assistant/` - UI and configuration
- `src/lib/nudges.ts` - Evaluation logic
- `src/server/nudges/` - Execution engine
- `supabase/nudges.sql` - Database schema

### 2. Onboarding Flows
**Purpose**: Guided member onboarding with step-by-step tasks

**Database Schema**:
- `onboarding_flows` - Flow definitions with audience targeting
- `onboarding_steps` - Individual steps (read, post, join, connect, custom)
- `onboarding_progress` - Member progress tracking

**Key Features**:
- **Step Types**: `read`, `post`, `join`, `connect`, `custom`
- **Audience Targeting**: By tiers and cohorts
- **Rewards**: Points, USD, badges per step
- **Nudge Integration**: Steps can trigger nudge recipes
- **Progress Tracking**: Status per member per step

**Code Locations**:
- `src/app/onboarding/` - Flow editor UI
- `src/server/onboarding/` - Business logic
- `supabase/onboarding.sql` - Database schema

### 3. Bounties System
**Purpose**: Reward-based challenges for community engagement

**Features**:
- **Reward Types**: USD (cents), points, badges
- **Status Management**: active, completed, archived
- **Participant Tracking**: Count members who claim/complete
- **Deadlines**: Optional deadline dates
- **Event Logging**: `bounty_events` table tracks claims/completions

**Code Locations**:
- `src/app/bounties/` - UI pages
- `src/server/data-adapter.ts` - CRUD operations
- Database: `bounties` and `bounty_events` tables

### 4. AI Content Indexing (RAG)
**Purpose**: Vector search over community content for AI assistant

**Database Schema**:
- `ai_sources` - Source definitions (forums, docs, announcements)
- `ai_docs` - Document metadata
- `ai_chunks` - Text chunks with embeddings (vector(1536))
- `ai_sync_runs` - Sync job history

**Features**:
- **Vector Embeddings**: OpenAI `text-embedding-3-small` (1536 dimensions)
- **Chunking**: Documents split into searchable chunks
- **Idempotent Sync**: Hash-based deduplication
- **Whop Integration**: Syncs Whop forums/docs/announcements
- **URL Fetcher**: Optional feature to fetch and index external URLs

**Code Locations**:
- `src/lib/embed.ts` - Embedding generation
- `src/lib/url-indexer.ts` - URL content fetching
- `supabase/04_ai_content_index.sql` - Schema
- `src/app/api/assistant/` - Search and sync endpoints

### 5. Whop Integration
**Purpose**: Sync community data from Whop platform

**Features**:
- **Webhook Handling**: Receives Whop events (`member.created`, `message.created`, `payment.succeeded`, `challenge.completed`)
- **Event Mapping**: Converts Whop events to internal activity logs
- **Member Sync**: Syncs members, tiers, roles
- **Document Sync**: Syncs forums, docs, announcements for RAG
- **Idempotency**: Prevents duplicate processing via `whop_event_id`

**Code Locations**:
- `src/app/api/webhooks/whop/route.ts` - Webhook handler
- `src/server/whop/map-events.ts` - Event transformation
- `src/server/adapters/whopAdapter.ts` - Data adapter
- `supabase/02_whop_docs.sql` - Whop document schema

### 6. Widget System
**Purpose**: Public-facing embeddable widget for members

**Features**:
- **Session Management**: JWT-based widget sessions
- **Bounties Display**: Shows active bounties
- **Onboarding Checklist**: Member progress visualization
- **Challenges**: Challenge/bounty interface

**Code Locations**:
- `src/app/widget/` - Widget pages
- `src/components/widget/` - Widget components
- `src/app/api/widget/session/route.ts` - Session endpoint

### 7. Analytics & Insights
**Purpose**: Track community engagement metrics

**Metrics Tracked**:
- **Members Total**: Total member count
- **Active Users**: Distinct active members in time window
- **Messages Count**: Message/activity count
- **Bounties Completed**: Completion count
- **Engagement Trend**: Daily active users over time

**Code Locations**:
- `src/app/overview/` - Dashboard UI
- `src/app/insights/` - Analytics pages
- `src/components/charts/` - Visualization components
- `src/server/data-adapter.ts` - Stats calculation

## Database Schema Overview

### Core Tables
- **`hubs`** - Hub/community definitions
- **`members`** - Member records with Whop integration
- **`bounties`** - Bounty/challenge definitions
- **`bounty_events`** - Bounty claim/completion events
- **`activity_logs`** - General activity tracking (posts, payments, etc.)

### Nudges System
- **`nudge_recipes`** - Nudge configurations
- **`nudge_runs`** - Execution batches
- **`nudge_messages`** - Individual messages with status
- **`member_preferences`** - Member opt-out/preferences

### Onboarding
- **`onboarding_flows`** - Flow definitions
- **`onboarding_steps`** - Step definitions
- **`onboarding_progress`** - Member progress

### AI/RAG
- **`ai_sources`** - Content source definitions
- **`ai_docs`** - Document metadata
- **`ai_chunks`** - Text chunks with vector embeddings
- **`whop_docs`** - Legacy Whop document storage (being migrated)

### System
- **`channels`** - Channel definitions
- **`system_metrics`** - System performance metrics

## Authentication & Authorization

### JWT-Based Authentication
- **Custom JWT tokens** with claims: `hub_id`, `role`, `member_id`
- **JWT signing secret** from environment
- **Middleware protection** for dashboard routes
- **Whop OAuth** integration for creator login

### Row Level Security (RLS)
- **Supabase RLS policies** enforce multi-tenant isolation
- **Role-based policies**: Creator, Moderator, Member
- **Helper functions**: `jwt_uuid()`, `jwt_text()` for claim extraction

### Route Protection
- **Protected routes**: `/overview`, `/ai-assistant`, `/bounties`, `/insights`, `/automation`, `/members`, `/settings`
- **Development mode**: Auto-allows access
- **Production**: Requires authentication or dev cookie

## API Structure

### Endpoint Categories
1. **Admin APIs** (`/api/admin/`)
   - Nudge logs viewing
   - Whop sync/backfill operations

2. **Hub APIs** (`/api/hub/[hubId]/`)
   - Bounties, members, insights
   - AI query/index operations
   - Onboarding flows

3. **Webhook APIs** (`/api/webhooks/`)
   - Whop webhook receiver

4. **Assistant APIs** (`/api/assistant/`)
   - Chat, search, source sync
   - URL fetching

5. **Nudge APIs** (`/api/nudges/`)
   - Dispatch and worker endpoints

6. **Widget APIs** (`/api/widget/`)
   - Session management

## Environment Variables

### Core Configuration
- `DATA_BACKEND` - Backend selection: `file`, `db`, `whop`, `whop-emulated`
- `DEMO_HUB_ID` - Default hub ID for development

### Supabase
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE` - Service role key (bypasses RLS)
- `SUPABASE_ANON_KEY` - Anonymous key
- `SUPABASE_JWT_SECRET` - JWT signing secret

### Whop Integration
- `WHOP_API_KEY` - Whop API key
- `WHOP_ORG_ID` - Whop organization ID
- `WHOP_WEBHOOK_SECRET` - Webhook verification secret
- `WHOP_SYNC_ENABLED` - Enable Whop sync

### OpenAI
- `OPENAI_API_KEY` - OpenAI API key for embeddings/AI
- `OPENAI_PROJECT` - OpenAI project ID
- `EMBEDDING_MODEL` - Embedding model (default: `text-embedding-3-small`)

### Feature Flags
- `FEATURE_NUDGES` - Enable nudge system
- `FEATURE_ONBOARDING` - Enable onboarding
- `NUDGES_ENABLED` - Runtime nudge execution
- `ENABLE_URL_FETCHER` - Enable URL content fetching
- `MAX_URL_PAGES` - Limit for URL fetching

### Security
- `ADMIN_TASK_TOKEN` - Token for admin operations
- `WORKER_SECRET` - Secret for worker endpoints
- `JWT_SIGNING_SECRET` - JWT token signing

## Current State & Known Patterns

### Migration Status
The project has been migrated from file-based storage to Supabase:
- **Migration scripts**: `scripts/migrate-to-supabase.mjs`
- **Versioned migrations**: `supabase/01_*.sql` through `07_*.sql`
- **Idempotent migrations**: All migrations use `if not exists` patterns

### Data Backend Flexibility
The adapter pattern allows switching between:
- **Development**: File backend for quick testing
- **Production**: Supabase backend for scalability
- **Integration Testing**: Whop emulated adapter

### Code Organization Principles
1. **Server Components**: Next.js App Router uses React Server Components by default
2. **Server Actions**: Form submissions and mutations use server actions
3. **API Routes**: Used for webhooks, external integrations, and complex operations
4. **Type Safety**: Comprehensive TypeScript types with Zod validation
5. **Component Library**: Radix UI primitives with custom styling

### Testing & Development
- **Vitest**: Configured for unit testing
- **Debug Endpoints**: `/api/debug/*` for development
- **Mock Data**: File-based seed data for development
- **Whop Dev Proxy**: `@whop-apps/dev-proxy` for local Whop development

## Key Dependencies & Versions

- **Next.js**: 15.5.6 (latest)
- **React**: 19.2.0 (latest)
- **TypeScript**: 5.9.3
- **Supabase JS**: 2.76.0
- **OpenAI SDK**: 6.6.0
- **Zod**: 4.1.12
- **Tailwind**: 3.4.14

## Development Workflow

### Scripts Available
- `pnpm dev` - Start development server
- `pnpm build` - Production build
- `pnpm typecheck` - Type checking
- `pnpm seed` - Seed file-based data
- `pnpm seed:db` - Seed Supabase database
- `pnpm migrate:db` - Run database migrations
- `pnpm whop:seed` - Seed Whop webhooks

### Database Migrations
Migrations are versioned and should be run in order:
1. `01_nudge_logs_enhancement.sql`
2. `02_whop_docs.sql`
3. `03_match_whop_docs.sql`
4. `04_ai_content_index.sql`
5. `05_add_unique_constraints.sql`
6. `06_add_url_fetcher_columns.sql`
7. `07_refresh_counts_fn.sql`

## Areas for Potential Development Focus

Based on the codebase structure, here are areas that could benefit from enhancement:

### 1. Testing Coverage
- Unit tests for business logic (nudges, onboarding)
- Integration tests for API endpoints
- E2E tests for critical user flows

### 2. Performance Optimization
- Database query optimization
- Caching strategies for stats/metrics
- Vector search performance tuning

### 3. Error Handling & Monitoring
- Sentry integration (currently disabled)
- Comprehensive error boundaries
- Logging infrastructure

### 4. Documentation
- API documentation (OpenAPI/Swagger)
- Component documentation (Storybook?)
- Developer onboarding guide

### 5. Security Enhancements
- Rate limiting refinement
- Input validation hardening
- Security audit of RLS policies

### 6. Feature Completeness
- Email channel implementation for nudges
- Advanced analytics/insights
- Member segmentation tools
- A/B testing for nudges

### 7. Developer Experience
- Better TypeScript strictness
- ESLint configuration improvements
- Pre-commit hooks
- CI/CD pipeline

---

**Document Version**: 1.0  
**Last Updated**: Based on current codebase state  
**Purpose**: Provide comprehensive overview for AI-assisted development guidance



