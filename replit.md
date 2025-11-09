# Book Pitch — Project Documentation

## Overview
Book Pitch is a **B2C marketplace** connecting new/undiscovered authors with book clubs and readers through a pitch-based discovery system.

**Business Model:**
- **Authors (paying customers):** Pay to pitch books to clubs, gaining access to multiple readers simultaneously rather than one-at-a-time discovery. Even free-tier authors benefit from AuthorSwap network.
- **Book Clubs (curators):** Discover fresh, new authors from the pitch library. Clubs vote via polls on which books to read together, then members review on Goodreads/Amazon (where reviews actually matter to authors).
- **Readers (free users, always):** Join clubs, participate in book selection, earn points redeemable for prizes. No subscription ever required - this removes friction for authors to gain readership.

**Core Value Exchange:**
- Authors get **multiple reviews + word-of-mouth** from entire book clubs at once (vs. traditional 1:1 reader acquisition)
- Clubs get **curated access to new authors** seeking discovery, with members rewarded for participation
- Readers get **gamified community experience** with points, badges, and prizes for discovering new books

**Key Strategic Decisions:**
- Reviews require Goodreads/Amazon URLs because that's where reviews matter to authors (not creating a competing review platform)
- Clubs limited to pitch library because that's the product - matching paying authors with discovery-focused clubs
- AuthorSwap network (free author-to-author swaps) serves as free-tier hook to attract authors, then upsell to club discovery
- Poll-based book selection mirrors real book club behavior (nominate → vote → read together)
- Points (not money) keep readers engaged long-term with prize redemption system

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
  - **AuthorSwap Detection:** Swaps between two users who both have the AUTHOR role are automatically flagged with `isAuthorSwap: true`. This enables FREE tier authors to do unlimited swaps with other authors for verified reviews.
  - **External Review Integration:** Reviews store external URLs (Goodreads/Amazon) with strict HTTPS-enforced hostname validation. Supports legitimate subdomains (m.goodreads.com, smile.amazon.com) while preventing phishing attacks through allowlist validation.
  - **Swap Review Badges:** Authors earn SWAP_VERIFIED badge (1st swap) and SWAP_MASTER badge (5th swap) for completing verified swaps with review proof. Swap reviews award badges, not points.
- **Reader Review System:** Club members can review books their club has selected from the pitch library.
  - **ClubBook Tracking:** Polls automatically create ClubBook entries when closed, recording which books each club has chosen to read.
  - **Review Requirements:** Must be active club member, book must be in club's ClubBook list from pitch library, require external proof URL (Goodreads/Amazon with HTTPS).
  - **Review Rewards:** Readers earn 50 points for each club book review, BOOK_REVIEWER badge (1st review), and CRITIC badge (10 reviews).
  - **Pitch Library Validation:** Both poll closure and review submission verify books are from pitch library (have associated pitches), preventing arbitrary book reviews.
- **Discovery & Search:** Unified full-text search (books, clubs, pitches) with PostgreSQL GIN indexes, AI-powered matching (if OpenAI configured), trending items.
- **Referral System:** Unique codes, referrer/referee tracking, point rewards.
- **Notifications:** Various types (POLL_CREATED, PITCH_ACCEPTED, SWAP_DELIVERED, etc.), unread counts, history.
- **Points & Badges System:** Gamified points economy for engagement actions (e.g., account creation, voting, pitching, reviewing club books), badge catalog (auto-awarded for milestones).
  - **Author Badges:** AUTHOR_LAUNCH (1st pitch), FAN_FAVORITE (3 club selections), SWAP_VERIFIED (1st verified swap), SWAP_MASTER (5 verified swaps).
  - **Reader Badges:** FIRST_VOTE, BOOKWORM (10 votes), BOOK_REVIEWER (1st club review), CRITIC (10 club reviews), LOYAL_MEMBER (3 clubs), SOCIABLE (20 messages).
  - **Host Badges:** DECISIVE (3 closed polls), CLUB_LEGEND (host of top 10 club).
- **Admin Dashboard (STAFF-only):** Comprehensive platform administration interface with tabs for Overview, Users, Clubs, Pitches, and Badges. Includes platform stats, user/tier/role management, poll closing, badge revocation, and content moderation. Features dual-layer authorization with backend `requireStaff` guards (early return pattern) and frontend role verification before rendering UI.

**User Roles (Multiple Roles Supported):**
- Users can hold **multiple roles simultaneously** (e.g., both AUTHOR and CLUB_ADMIN)
- Database schema uses `roles: UserRole[]` array instead of single `role` field
- All backend route files use `hasRole(user, 'ROLE_NAME')` helper for role checking
- **READER:** Browse, vote, join clubs, participate, earn points/badges. **Always free** - no subscription required.
- **AUTHOR:** Create pitches, submit to clubs, access analytics, participate in AuthorSwap. Can subscribe to paid tiers for advanced features.
- **CLUB_ADMIN:** Create/manage clubs, nominate pitches, create polls, manage members, earn host badges. Creating a club **adds** CLUB_ADMIN role without removing existing roles.
- **STAFF:** Platform moderation, system administration, role management (can add/remove roles from users).

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

**Monetization Features (Phase 1 - COMPLETE ✅):**
- **Tier-Based Pitch Limits:** ✅ Enforced limits (FREE: 3, PRO: 10, PUBLISHER: unlimited) with usage indicators
- **Visibility Boost Algorithm:** ✅ Premium tier pitches ranked higher in discovery (PUBLISHER > PRO > FREE)
- **Tier Synchronization:** ✅ Denormalized authorTier field auto-syncs across all tier changes (admin, webhooks, creation)
- **Promotion Credits System:** ✅ Three credit packages (10, 50, 100 credits at $0.10 each) with Stripe checkout integration
- **Pitch Boosting:** ✅ Authors spend credits to boost pitch visibility for 7/14/30 days with automatic expiration handling
- **Club Sponsorships:** ✅ Full sponsorship system with club targeting (genres, member count, frequency), impression/click tracking, and analytics endpoints
- **Stripe Integration:** ✅ Complete payment flow with 3DS/SCA support, webhook handlers for subscription and credit purchases
- **Transaction History:** ✅ Credit purchase/spend tracking with balance history displayed on Billing page

## External Dependencies
**Third-Party Services:**
- **Supabase:** PostgreSQL database hosting and user authentication.
- **Stripe:** Payment processing for subscriptions, credits, and sponsorships.
- **Resend:** Transactional email service for verification, password reset, notifications.
- **OpenAI (Optional):** AI-powered blurb generation, embeddings, book/club matching, toxicity detection (GPT-4o-mini, text-embedding-3-small, moderation API). Gracefully degrades if not configured.

**Key Libraries:**
- **Frontend:** Radix UI, TanStack Query, Wouter, Zod, Tailwind CSS, Lucide React.
- **Backend:** Fastify, Prisma, Zod, Stripe SDK, Helmet.js, `@fastify/csrf-protection`.