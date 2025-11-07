# Book Pitch — Project Documentation

## Overview
Book Pitch is a social marketplace and discovery platform designed to connect authors, book clubs, and readers. It combines elements of social networking, crowdfunding, and gamification to create an engaging ecosystem. The platform allows authors to pitch their books directly to readers and clubs, while readers and clubs earn rewards for participation and content discovery. The core value proposition includes audience building and feedback for authors, diverse reading discovery and community engagement for book clubs, and personalized reading experiences with gamified rewards for readers. Key differentiators are community-driven discovery, extensive gamification, direct author-reader connections, an AuthorSwap network for verified reviews, and multiple monetization avenues for authors. The project aims to become the leading platform for community-driven book discovery and author-reader interaction.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The project utilizes a monorepo structure managed by pnpm workspaces, separating frontend, backend, and shared packages.

**Frontend Architecture:**
- **Technology Stack:** React 18, Vite, TypeScript, Tailwind CSS, Wouter (routing).
- **Design System:** Linear-inspired aesthetic emphasizing clarity, purposeful whitespace, and typography (Inter and JetBrains Mono).
- **State Management:** TanStack Query for server state.
- **Component Library:** Custom UI components built with Radix UI primitives, CVA, and Tailwind CSS.
- **Key Pages:** Authentication, Onboarding (role selection, profile preferences), Discovery (search, trending, club browsing), Profile (points, badges, history), Books (library, swaps), Clubs (creation, discovery, room, management), Pitches (browsing, submission, analytics), Analytics (author dashboard), Billing (subscriptions, credits - planned), Referrals, Admin (STAFF-only dashboard).
- **UI/UX Decisions:** Strict adherence to Lucide React for icons; no emojis allowed.

**Backend Architecture:**
- **Technology Stack:** Fastify, TypeScript, Prisma ORM, Zod validation.
- **API Design:** RESTful API with `/api` prefix, resource-oriented.
- **Security:** Helmet.js (CSP, HSTS, X-Frame-Options), CSRF protection (`@fastify/csrf-protection`), IP-based rate limiting on auth endpoints, email verification, password reset.
- **Authentication:** Supabase JWT verification middleware; gracefully degrades if Supabase is not configured. `ensureUser` middleware syncs user records with Supabase Auth.
- **Validation:** Zod schemas for all incoming requests.
- **Response Format:** Standardized `{ success: boolean, data?: T, error?: string }`.
- **Error Handling:** Centralized with appropriate HTTP status codes.

**Data Storage:**
- **Database:** PostgreSQL (via Supabase or standalone).
- **ORM:** Prisma for type-safe access.
- **Schema Design:** Models for Users, Books, Clubs, Pitches (with statuses: SUBMITTED, NOMINATED, ACCEPTED, REJECTED), Swaps, Payments, Social features (Referral, Notification).
- **Full-Text Search:** PostgreSQL GIN indexes on `Pitch`, `Club`, and `Book` models using `to_tsvector()` and `ts_rank()`.
- **Migration Strategy:** Prisma migrations.

**Authentication and Authorization:**
- **Provider:** Supabase Auth (email verification, password reset, rate limiting, email enumeration prevention).
- **Flow:** Frontend handles Supabase Auth, stores JWT; backend middleware verifies JWT.
- **Authorization:** Resource-level ownership checks, STAFF role-based access control for admin features.
- **Admin Security:** Dual-layer protection with backend `requireStaff` middleware (returns boolean, forces early exit on failure) and frontend role verification (fetches user data, renders access denied for non-STAFF).

**Single-Port Deployment:**
- Both React SPA and Fastify API are served from a single port (5000) in production/Replit environments, with Fastify serving static files and handling SPA routing fallback.

**Core Features Implemented:**
- **Book Pitches:** Creation, targeting, status tracking, author analytics.
- **Voting & Polls:** Club-based polls from nominated pitches, member voting, point awards, automatic status updates for winning pitches.
- **Book Clubs:** Creation, discovery, customizable join rules, club rooms (Feed, Polls, Info), member management (approve, promote, remove).
- **Author Analytics:** Dashboard metrics (pitches, acceptance rate, impressions, votes) and individual pitch analytics.
- **Book Swaps:** Peer-to-peer swap requests with a state machine (REQUESTED → ACCEPTED → DELIVERED → VERIFIED), deliverable tracking, tier-based limits.
- **Discovery & Search:** Unified full-text search (books, clubs, pitches) with PostgreSQL GIN indexes, AI-powered matching (if OpenAI configured), trending items.
- **Referral System:** Unique codes, referrer/referee tracking, point rewards.
- **Notifications:** Various types (POLL_CREATED, PITCH_ACCEPTED, SWAP_DELIVERED, etc.), unread counts, history.
- **Points & Badges System:** Gamified points economy for engagement actions (e.g., account creation, voting, pitching), badge catalog (auto-awarded for milestones).
- **Admin Dashboard (STAFF-only):** Comprehensive platform administration interface with tabs for Overview, Users, Clubs, Pitches, and Badges. Includes platform stats, user/tier/role management, poll closing, badge revocation, and content moderation. Features dual-layer authorization with backend `requireStaff` guards (early return pattern) and frontend role verification before rendering UI.

**User Roles:**
- **READER:** Browse, vote, join clubs, participate, earn points/badges. **Always free** - no subscription required.
- **AUTHOR:** Create pitches, submit to clubs, access analytics, participate in AuthorSwap. Can subscribe to paid tiers for advanced features.
- **CLUB_ADMIN:** Create/manage clubs, nominate pitches, create polls, manage members, earn host badges.
- **STAFF:** Platform moderation, system administration.

**Subscription Tiers & Business Model:**
- **Readers:** Always completely free - no subscription ever required.
- **Authors - FREE Tier:** Includes core features:
  - AuthorSwap network (swap books with other authors for free)
  - Get books read by other authors
  - Receive reviews from other authors
  - Basic pitch submission
  - Limited swaps/AI calls
- **Authors - PRO ($9.99/mo):** Increased limits, pitch boosting with credits, advanced analytics.
- **Club Admins - PRO CLUB ($19.99/mo):** Advanced club features, sponsorship opportunities.
- **Authors - PUBLISHER ($49.99/mo):** Unlimited features, priority support.

**Monetization Features (Phase 1 - In Progress):**
- **Tier-Based Pitch Limits:** ✅ Enforced limits (FREE: 3, PRO: 10, PUBLISHER: unlimited) with usage indicators
- **Visibility Boost Algorithm:** ✅ Premium tier pitches ranked higher in discovery (PUBLISHER > PRO > FREE)
- **Tier Synchronization:** ✅ Denormalized authorTier field auto-syncs across all tier changes (admin, webhooks, creation)
- **Promotion Credits System:** (Pending) Authors purchase credits to boost pitch visibility or sponsor clubs
- **Pitch Boosting:** (Pending) Spend credits to increase pitch impressions for 7/14/30 days
- **Club Sponsorships:** (Pending) Target specific clubs with sponsored content
- **Stripe Integration:** Complete payment flow with 3DS/SCA support
- **Analytics Dashboard:** Track ROI on promotional spending

## External Dependencies
**Third-Party Services:**
- **Supabase:** PostgreSQL database hosting and user authentication.
- **Stripe:** Payment processing for subscriptions, credits, and sponsorships.
- **Resend:** Transactional email service for verification, password reset, notifications.
- **OpenAI (Optional):** AI-powered blurb generation, embeddings, book/club matching, toxicity detection (GPT-4o-mini, text-embedding-3-small, moderation API). Gracefully degrades if not configured.

**Key Libraries:**
- **Frontend:** Radix UI, TanStack Query, Wouter, Zod, Tailwind CSS, Lucide React.
- **Backend:** Fastify, Prisma, Zod, Stripe SDK, Helmet.js, `@fastify/csrf-protection`.