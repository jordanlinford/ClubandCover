# Club & Cover — Project Documentation

## Overview
Club & Cover is a B2C marketplace connecting new authors with book clubs and readers through a pitch-based discovery system. Authors pay to pitch their books, gaining access to multiple readers and reviews simultaneously. Book clubs discover new authors and members earn points for participation, redeemable for prizes. The core value proposition is providing authors with multiple reviews and word-of-mouth through entire book clubs, while offering clubs curated access to new literary talent and a gamified community experience for readers. The platform integrates reviews with external services like Goodreads and Amazon, and uses a poll-based selection process mirroring real book club dynamics.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The project is a monorepo using pnpm workspaces for frontend, backend, and shared packages.

**Frontend:** Built with React 18, Vite, TypeScript, Tailwind CSS, and Wouter. It features a Linear-inspired design, uses TanStack Query for server state, and a custom component library based on Radix UI. Key pages include Authentication, Onboarding, Discovery, Profile, Books, Clubs, Pitches, Analytics, Billing (planned), Referrals, and an Admin dashboard. UI/UX strictly uses Lucide React for icons.

**Backend:** Developed with Fastify, TypeScript, Prisma ORM, and Zod validation. It provides a RESTful API, implements security measures like Helmet.js and CSRF protection, and uses Supabase JWT for authentication. All incoming requests are validated with Zod schemas, and responses adhere to a standardized `{ success: boolean, data?: T, error?: string }` format.

**Data Storage:** PostgreSQL (Supabase or standalone) with Prisma ORM. The schema includes Users, Books, Clubs, Pitches (with various statuses), Swaps, Payments, and Social features. Full-text search is implemented using PostgreSQL GIN indexes.

**Authentication & Authorization:** Supabase Auth handles user authentication, with a backend middleware verifying JWTs. Authorization is resource-level and role-based (READER, AUTHOR, CLUB_ADMIN, STAFF), with users able to hold multiple roles. A development bypass (`/api/auth/dev-login`) is available for local testing, strictly guarded for development environments only.

**Single-Port Deployment:** Both the React SPA and Fastify API are served from a single port (5000) in production/Replit environments, with Fastify managing static files and SPA routing.

**Core Features:**
-   **Book Pitches:** Creation, targeting, status tracking, and author analytics.
-   **Voting & Polls:** Club-based polls for book selection, member voting, and point awards.
-   **Book Clubs:** Creation, discovery, member management, and customizable join rules.
-   **Author Analytics:** Dashboard with metrics on pitches, acceptance rates, and impressions.
-   **Book Swaps:** Peer-to-peer book exchange system with a state machine, deliverable tracking, and tier-based limits. Includes `AuthorSwap` for free author-to-author reviews and external review integration with Goodreads/Amazon.
-   **Reader Review System:** Club members can review books selected by their club, earning points and badges for external reviews (Goodreads/Amazon).
-   **Discovery & Search:** Unified full-text search with PostgreSQL GIN indexes and optional AI-powered matching.
-   **Referral System:** Unique codes and point rewards for referrers and referees.
-   **Notifications:** Various types of notifications with unread counts and history.
-   **Points & Badges System:** Gamified rewards for engagement actions and milestones, with distinct badges for Authors, Readers, and Hosts.
-   **Admin Dashboard (STAFF-only):** Comprehensive platform administration, including user/club/pitch management, content moderation, and platform statistics, secured by dual-layer authorization.

**User Roles:** Users can hold multiple roles (READER, AUTHOR, CLUB_ADMIN, STAFF). READER is always free. AUTHORs can subscribe to paid tiers for advanced features. CLUB_ADMINs manage clubs. STAFF performs platform administration.

**Subscription Tiers & Business Model:**
-   **Readers:** Always free.
-   **Authors (FREE, PRO, PUBLISHER):** Different tiers offer varying limits on pitches, swaps, and AI calls, with PRO and PUBLISHER tiers providing increased limits, pitch boosting, and advanced analytics.
-   **Club Admins (PRO CLUB):** Advanced club features and sponsorship opportunities.
-   **Monetization Features:** Includes tier-based pitch limits, a visibility boost algorithm, promotion credits system (purchased via Stripe), pitch boosting with credits, and club sponsorships with impression/click tracking. Stripe integration handles all payment flows and webhooks.

## External Dependencies
**Third-Party Services:**
-   **Supabase:** PostgreSQL database and user authentication.
-   **Stripe:** Payment processing for subscriptions, credits, and sponsorships.
-   **Resend:** Transactional email service.
-   **OpenAI (Optional):** AI for blurb generation, embeddings, matching, and toxicity detection.

**Key Libraries:**
-   **Frontend:** Radix UI, TanStack Query, Wouter, Zod, Tailwind CSS, Lucide React.
-   **Backend:** Fastify, Prisma, Zod, Stripe SDK, Helmet.js, `@fastify/csrf-protection`.

## Future Features / Backlog
**Planned for Later Sprints:**
-   **Club Badges:** Club-specific achievements and badges to display in the club room, rewarding club milestones, engagement, and participation.