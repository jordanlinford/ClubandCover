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

**Key Pages**: Authentication, Profile, Book Management, Club Management, Swap Management, and Billing (placeholder). This also includes pages for pitch submission, voting, and club host management.

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

**Schema Design**: Includes models for `User`, `Book`, `Club`, `Membership`, `Swap`, `Embedding`, `Pitch`, `Poll`, `PollOption`, `Vote`, and `PointLedger`.

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
- Purpose: Transactional email service for swap notifications.
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

**Shared**:
- TypeScript: Type safety across the stack.
- Zod: Shared validation schemas.