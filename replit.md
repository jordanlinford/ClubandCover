# Overview

This is a book club and book swap platform built as a modern full-stack monorepo using pnpm workspaces. The application enables users to manage personal book collections, join book clubs, and request book swaps with other community members. It features a React-based frontend with a Linear-inspired design system and a Fastify-powered backend API.

The platform is designed for book enthusiasts who want to share, discover, and exchange books within clubs and communities. Users can catalog their books, participate in reading groups, and facilitate peer-to-peer book swaps.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Monorepo Structure

**Decision**: Use pnpm workspaces to manage a monorepo with separate frontend, backend, and shared packages.

**Rationale**: This structure enables code sharing between frontend and backend (especially for type definitions and validation schemas) while maintaining clear separation of concerns. pnpm workspaces provide efficient dependency management and faster installs compared to alternatives.

**Structure**:
- `apps/web`: React 18 frontend application
- `apps/api`: Fastify backend API
- `packages/types`: Shared Zod schemas and TypeScript types for API contracts
- `packages/ui`: Shared Tailwind CSS component library
- `packages/config`: Shared ESLint, Prettier, and TypeScript configurations

## Frontend Architecture

**Technology Stack**: React 18 + Vite + TypeScript + Tailwind CSS + Wouter (routing)

**Design System**: Linear-inspired aesthetic with influences from Stripe and Vercel, focusing on clarity, purposeful whitespace, and typography-driven hierarchy. The design uses Inter for UI text and JetBrains Mono for technical content.

**State Management**: TanStack Query (React Query) for server state management with built-in caching and request deduplication.

**Routing**: Wouter for lightweight client-side routing instead of React Router.

**Component Library**: Custom UI components built with Radix UI primitives, CVA (class-variance-authority) for variant management, and Tailwind CSS for styling. Components include Button, Input, Card, PageHeader, and DataTable.

**Key Pages**:
- Authentication (Sign In/Sign Up) with mock implementation when Supabase is not configured
- Profile management
- Book management (list, create, edit, detail views)
- Club management (directory, create, detail views)
- Swap management (sent/received tabs)
- Billing (placeholder for future Stripe integration)

## Backend Architecture

**Technology Stack**: Fastify + TypeScript + Prisma ORM + Zod validation

**API Design**: RESTful API with `/api` prefix, organized by resource (books, clubs, memberships, swaps, billing).

**Authentication Middleware**: Supabase JWT verification middleware that reads the `Authorization: Bearer <token>` header, verifies the token, and attaches user information to the request object. Authentication is optional for most routes to allow the application to run without Supabase configuration.

**User Management**: `ensureUser` middleware automatically creates or updates user records in the database when authenticated requests are made, syncing with Supabase Auth.

**Request Validation**: All incoming requests are validated using Zod schemas defined in the shared `@repo/types` package before processing.

**Response Format**: Standardized API response structure with `{ success: boolean, data?: T, error?: string }` format.

**Error Handling**: Centralized error handling with appropriate HTTP status codes and error messages.

## Data Storage

**Database**: PostgreSQL via Supabase (or any PostgreSQL instance via `DATABASE_URL`)

**ORM**: Prisma for type-safe database access with schema-first modeling

**Schema Design**:
- `User`: User accounts synced with Supabase Auth (id, email, name, avatarUrl, bio)
- `Book`: Book catalog with ownership, condition tracking, and availability status
- `Club`: Book clubs with privacy settings and member limits
- `Membership`: Join table for users and clubs with roles (OWNER, ADMIN, MEMBER, PENDING) and status tracking
- `Swap`: Book exchange requests with state management (PENDING, ACCEPTED, DECLINED, COMPLETED, CANCELLED)

**Migration Strategy**: Prisma migrations with `prisma migrate` for production and `prisma db push` for development.

## Authentication and Authorization

**Provider**: Supabase Auth for user authentication

**Flow**: 
1. Users sign up/sign in via Supabase Auth SDK in the frontend
2. Frontend stores the JWT token and includes it in API requests
3. Backend middleware verifies the JWT and extracts user information
4. User records are automatically created/updated in the application database

**Graceful Degradation**: The application includes mock authentication flows and will operate with limited functionality when Supabase credentials are not configured, allowing development and testing without external dependencies.

**Authorization**: Resource-level ownership checks ensure users can only modify their own books, clubs they own/administer, and swaps they're involved in.

## Single-Port Deployment

**Decision**: Serve both the React SPA and API from a single port (5000) in production/Replit environments.

**Implementation**: Fastify serves the built React application as static files and handles SPA routing fallback. API routes are prefixed with `/api` to avoid conflicts.

**Development**: In local development, the web app runs on port 5173 (Vite) and API runs on port 3000 (Fastify) with CORS enabled.

# External Dependencies

## Third-Party Services

**Supabase**: 
- Purpose: PostgreSQL database hosting and user authentication
- Integration: Database via Prisma with `DATABASE_URL`, Auth via `@supabase/supabase-js` client
- Required Environment Variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`

**Stripe**:
- Purpose: Payment processing and subscription management (planned feature)
- Integration: Stripe SDK on backend, Stripe Elements on frontend
- Required Environment Variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLIC_KEY`
- Current Status: Placeholder billing page exists; full integration pending

## Additional External APIs

**Resend** (Planned):
- Purpose: Transactional email service
- Environment Variable: `RESEND_API_KEY`

**OpenAI** (Planned):
- Purpose: Book recommendations and content features
- Environment Variable: `OPENAI_API_KEY`

## Key Libraries

**Frontend**:
- Radix UI: Accessible, unstyled component primitives
- TanStack Query: Server state management
- Wouter: Lightweight routing
- Zod: Runtime type validation
- Tailwind CSS: Utility-first styling

**Backend**:
- Fastify: High-performance web framework
- Prisma: Type-safe ORM
- Zod: Request validation
- Stripe SDK: Payment processing

**Shared**:
- TypeScript: Type safety across the stack
- Zod: Shared validation schemas ensure contract consistency