# Overview

This is a book club and book swap platform built as a modern full-stack monorepo using pnpm workspaces. The application enables users to manage personal book collections, join book clubs, and request book swaps with other community members. It features a React-based frontend with a Linear-inspired design system and a Fastify-powered backend API.

The platform is designed for book enthusiasts who want to share, discover, and exchange books within clubs and communities. Users can catalog their books, participate in reading groups, facilitate peer-to-peer book swaps, and engage in book club governance through pitches and voting. The application now includes a complete pitch-to-poll-to-points workflow for book clubs, enabling authors to submit pitches, club owners to create polls, members to vote and earn points, and winning authors to receive rewards.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Monorepo Structure

**Decision**: Use pnpm workspaces to manage a monorepo with separate frontend, backend, and shared packages for efficient code sharing and clear separation of concerns.

**Structure**:
- `apps/web`: React 18 frontend application
- `apps/api`: Fastify backend API
- `packages/types`: Shared Zod schemas and TypeScript types
- `packages/ui`: Shared Tailwind CSS component library
- `packages/config`: Shared ESLint, Prettier, and TypeScript configurations

## Frontend Architecture

**Technology Stack**: React 18 + Vite + TypeScript + Tailwind CSS + Wouter (routing)

**Design System**: Linear-inspired aesthetic focusing on clarity, purposeful whitespace, and typography (Inter and JetBrains Mono).

**State Management**: TanStack Query for server state management.

**Routing**: Wouter for lightweight client-side routing.

**Component Library**: Custom UI components built with Radix UI primitives, CVA, and Tailwind CSS.

**Key Pages**: Authentication, Profile, Book Management, Club Management, Swap Management, Billing (placeholder), Pitch Submission, Voting, Club Host Management, Referral Dashboard, Discover (with full-text search), Onboarding Checklists, and Author Analytics.

**Sprint-5 Growth Features**: Referral system with unique codes and rewards, real-time notifications with bell indicator, full-text search across books/clubs/pitches, role-based onboarding checklists (Reader/Author/Host), author performance analytics, and email rate limiting (3 emails per type per day).

## Backend Architecture

**Technology Stack**: Fastify + TypeScript + Prisma ORM + Zod validation

**API Design**: RESTful API with `/api` prefix, organized by resource.

**Authentication Middleware**: Supabase JWT verification, optionally allowing the application to run without Supabase configuration.

**User Management**: `ensureUser` middleware syncs user records with Supabase Auth.

**Request Validation**: All incoming requests are validated using Zod schemas.

**Response Format**: Standardized `{ success: boolean, data?: T, error?: string }` format.

**Error Handling**: Centralized error handling with appropriate HTTP status codes.

## Data Storage

**Database**: PostgreSQL via Supabase (or any PostgreSQL instance).

**ORM**: Prisma for type-safe database access.

**Schema Design**: Includes models for `User`, `Book`, `Club`, `Membership`, `Swap`, `Embedding`, `Pitch`, `Poll`, `PollOption`, `Vote`, `PointLedger`, `Referral`, `Notification`, `UserSetting`, `ChecklistProgress`, and `EmailLog`.

**Full-Text Search**: GIN indexes on `Pitch`, `Club`, and `Book` models enable PostgreSQL full-text search with `to_tsvector()` and `ts_rank()` for relevance scoring.

**Migration Strategy**: Prisma migrations.

## Authentication and Authorization

**Provider**: Supabase Auth for user authentication.

**Flow**: Frontend handles Supabase Auth, stores JWT, which is verified by backend middleware. User records are automatically managed.

**Graceful Degradation**: Operates with limited functionality without Supabase configuration. Includes test support routes for automated testing when `NODE_ENV=test`.

**Authorization**: Resource-level ownership checks.

## Single-Port Deployment

**Decision**: Serve both the React SPA and API from a single port (5000) in production/Replit environments using Fastify to serve static files and handle SPA routing fallback.

## AI and Discovery Features

**AI Library**: OpenAI client for blurb generation (GPT-4o-mini), embeddings (text-embedding-3-small), and cosine similarity calculations. Includes `isAIEnabled()`, `generateBlurb()`, `generateEmbedding()`, and `cosineSimilarity()` functions.

**Database Updates**: `Book` and `Club` models include `genres` and `subtitle`. `Embedding` model supports `BOOK` and `CLUB` entities. `User` model includes `aiCallsToday` and `aiCallsResetAt` for rate limiting.

**API Routes**: Dedicated routes for AI functionalities like generating blurbs, indexing embeddings, re-indexing all data, and matching similar books/clubs.

**Middleware**: `aiRateLimit` enforces tier-based rate limits (FREE: 10/day, PRO_AUTHOR: 50/day).

**Auto-Indexing**: Books and Clubs automatically generate embeddings on creation when OpenAI is configured.

**Graceful Degradation**: AI features are gracefully disabled if `OPENAI_API_KEY` is not configured, allowing the application to function without them.

## Messaging and Moderation Features

**Messaging**: Implements message threads with Prisma models.

**AI Toxicity Detection**: Utilizes OpenAI moderation API for content screening.

**Moderation Queue**: Provides a queue for staff review of flagged content.

# External Dependencies

## Third-Party Services

**Supabase**:
- Purpose: PostgreSQL database hosting and user authentication.
- Integration: Database via Prisma, Auth via `@supabase/supabase-js`.
- Required Environment Variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`.

**Stripe**:
- Purpose: Payment processing and subscription management (planned feature).
- Integration: Stripe SDK on backend, Stripe Elements on frontend.
- Required Environment Variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLIC_KEY`.

**Resend**:
- Purpose: Transactional email service for swap notifications, referral activation alerts, and poll result announcements.
- Rate Limiting: 3 emails per type per day per user (tracked via EmailLog model).
- Environment Variable: `RESEND_API_KEY`.

**OpenAI**:
- Purpose: AI-powered blurb generation, embeddings, and book/club matching.
- Models: GPT-4o-mini (text generation), text-embedding-3-small (embeddings).
- Environment Variable: `OPENAI_API_KEY`.

## Key Libraries

**Frontend**:
- Radix UI: Accessible, unstyled component primitives.
- TanStack Query: Server state management.
- Wouter: Lightweight routing.
- Zod: Runtime type validation.
- Tailwind CSS: Utility-first styling.

**Backend**:
- Fastify: High-performance web framework.
- Prisma: Type-safe ORM.
- Zod: Request validation.
- Stripe SDK: Payment processing.

## Sprint-5 Growth Features

**Referral System** (Date: November 2025):
- Unique referral codes per user with automatic generation
- Track referrer/referee relationships with activation status
- Reward both parties with points on first book addition
- API: `/api/referrals` (GET, POST, PATCH)
- Service: `apps/api/src/lib/referrals.ts`

**Notifications** (Date: November 2025):
- Real-time notification system for user actions
- Types: SWAP_REQUEST, SWAP_ACCEPTED, POLL_CREATED, POLL_RESULT, REFERRAL_ACTIVATED
- Read/unread tracking with mark-all-read functionality
- Bell indicator with unread count badge
- API: `/api/notifications` (GET, POST, PATCH)
- Service: `apps/api/src/lib/notifications.ts`
- Components: `NotificationBell`, `NotificationList`

**Full-Text Search** (Date: November 2025):
- PostgreSQL GIN indexes on books, clubs, and pitches
- Relevance-ranked search results using `ts_rank()`
- Unified `/api/discover/search?q=` endpoint
- Trending items endpoint: `/api/discover/trending`
- Page: `/discover` with `SearchBar` and `TrendingGrid` components
- Service: `apps/api/src/lib/search.ts`

**Onboarding Checklists** (Date: November 2025):
- Role-based checklists: READER_ONBOARDING, AUTHOR_ONBOARDING, HOST_ONBOARDING
- Progress tracking per user with completion percentage
- API: `/api/checklists` (GET, POST)
- Page: `/onboarding` with `ChecklistCard` component
- Service: `apps/api/src/lib/checklists.ts`

**Author Analytics** (Date: November 2025):
- Performance metrics: pitches submitted, polls won, total votes, points earned
- Engagement tracking: pitch views, voting participation
- Leaderboard position and recent activity
- API: `/api/analytics/author` (GET)
- Page: `/analytics` (restricted to AUTHOR and PRO_AUTHOR roles)
- Service: `apps/api/src/lib/analytics.ts`

**Email Rate Limiting** (Date: November 2025):
- Daily cap: 3 emails per type per user (configurable via DAILY_EMAIL_CAP_PER_TYPE)
- Types: SWAP_NOTIFICATION, REFERRAL_ACTIVATION, POLL_RESULT
- EmailLog model tracks all sent emails with timestamps
- Service: `apps/api/src/lib/email.ts` with `canSendEmail()` check

**Poll Creation Improvements** (Date: November 2025):
- One-shot endpoint: `/api/polls/full` creates poll + options atomically
- Eliminates multi-step client flow for better UX
- `PollBuilderModal` uses single mutation instead of separate create/add-options calls

## Sprint-6 Reader & Club Features

**Reader Onboarding** (Date: November 2025):
- Two-step wizard: role selection (READER, AUTHOR, CLUB_ADMIN) + profile preferences
- Profile preferences: favorite genres, books/month reading pace, bio
- UserProfile model with `genres`, `booksPerMonth`, `bio`, `avatarUrl` fields
- API: `/api/onboarding/role` (POST), `/api/onboarding/profile` (PATCH)
- Routes: `apps/api/src/routes/onboarding.ts`
- Component: `OnboardingWizard` with interactive genre selection and reading pace slider
- Page: `/onboarding` displays wizard for new users without profiles

**Enhanced Club Discovery** (Date: November 2025):
- Advanced search with filters: text query, genres, reading frequency, minPointsToJoin
- Pagination support with configurable page size
- Club model enhancements: `about`, `genres`, `frequency`, `minPointsToJoin` fields
- API: `/api/clubs/search?q=...&genres=...&frequency=...&minPoints=...` (GET)
- Enhanced club creation validates new fields with Zod schemas
- Service: Club search logic in `apps/api/src/routes/clubs.ts`

**Club Room** (Date: November 2025):
- Tabbed interface: Feed (messages), Polls (voting), Info (club details)
- Feed tab: Post and view club messages with author attribution
- Messages limited to club members with rate limiting (60 messages/hour per user)
- ClubMessage model: `id`, `clubId`, `userId`, `body`, `createdAt`
- API: `/api/clubs/:id/messages` (GET with pagination, POST to create)
- Routes: `apps/api/src/routes/club-messages.ts`
- Page: `/clubs/:id/room` with `ClubRoomPage` component
- UI: Shows club header with genres, frequency, member count, and current poll status

**Data Model Updates** (Date: November 2025):
- Migration: `sprint6_readers_clubs` adds UserProfile table and extends Club/ClubMessage models
- UserProfile: Stores user role and reading preferences separate from core User model
- Club: Added `about` (longform description), `genres` (array), `frequency` (books/year), `minPointsToJoin`
- ClubMessage: Simple message feed for club communication
- Database indexes: ClubMessage indexed by clubId for efficient feed queries

**Shared**:
- TypeScript: Type safety across the stack.
- Zod: Shared validation schemas.