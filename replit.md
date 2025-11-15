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

## Recent Changes
**November 2025 - Test Infrastructure Refactor:**
-   **Factory Pattern Implementation:** Created comprehensive testFactories.ts with enum constants (TestEnums) and type-safe factory functions for all models (Book, Poll, Pitch, PitchNomination, PointLedger, RewardItem, RedemptionRequest, MessageThread), ensuring schema-aligned test data creation
-   **Test Suite Refactoring:** Migrated all 3 test files (free-tier-reader, author-tier-limits, suspension) from raw Prisma calls to factory pattern, fixing 23+ schema mismatches and TypeScript compilation errors
-   **Repeatability Fixes:** Implemented unique email generation using timestamps for all test users, preventing unique constraint violations across test runs
-   **Enhanced Cleanup:** Extended deleteTestUser() helper to handle all FK relations (threadMember, pitchNomination, clubs, messages, votes, etc.) in proper deletion order
-   **Auth Helper Improvements:** Fixed UserRole typing, UserProfile.userId usage, and Message.senderId references in auth.ts
-   **Test Status:** Tests compile cleanly (0 TypeScript errors), run repeatably (14 tests total, 9 passing), with 5 behavioral failures related to API endpoint implementation (not test infrastructure issues)
-   **Stripe API Version:** Updated to 2025-10-29.clover for compatibility with latest Stripe SDK

**November 2025 - Account Management & Privacy (Phase 1):**
-   **Password Change While Logged In:** Implemented POST /api/users/me/change-password endpoint with current password verification via Supabase auth, strength validation (8+ chars, uppercase, lowercase, number), rate limiting (max 3 attempts/hour including failures), audit logging with IP/user agent for all attempts, and email notifications upon successful changes
-   **Display Name Updates:** Extended PATCH /api/users/me/profile to support User.name changes with character validation (2-50 chars, alphanumeric + spaces/dots/underscores/hyphens), profanity filtering via blocklist, rate limiting (max 3 changes/day), and audit logging (old name → new name with timestamps)
-   **Enhanced Settings UI:** Added password change form with current/new/confirm password fields, inline strength validation, show/hide toggles, and display name change form with current name display and rate limit notifications
-   **Audit Tables:** Added PasswordChangeLog (tracks all password change attempts with timestamp, IP, user agent) and DisplayNameChangeLog (tracks name changes with old/new values and timestamp)
-   **Privacy Controls Enforcement:** Fixed public club detail endpoint (GET /clubs/:id) to respect showClubs privacy setting - only members who have showClubs enabled appear in public member lists. Clarified privacy architecture: UserProfile privacy settings (showClubs, showBadges, showGenres) control reader profile visibility, while AuthorProfile.genres remain public for author discovery. Club admin member endpoint (/clubs/:id/members) intentionally shows all members for management purposes.
-   **Pricing Model Validation & Test Coverage:** Completed comprehensive audit confirming readers remain free - zero paywalls on club joining, voting, messaging, pitch viewing, or rewards. Created two test suites: `free-tier-reader.test.ts` (validates all reader actions work on FREE tier) and `author-tier-limits.test.ts` (enforces pitch/swap/AI limits per tier). Removed PRO_CLUB from Billing UI upgrade flow - tier remains in backend for existing subscribers but hidden until premium club host features are implemented. Published complete pricing documentation in `docs/pricing-access.md`.

**November 2025:**
-   **Production-Ready Suspension System:** Implemented comprehensive abuse control and safety features:
    -   **Universal Enforcement:** Created onRequest hook that blocks SUSPENDED/DISABLED/DELETED users from all mutating operations (POST/PATCH/PUT/DELETE) across the entire API, ensuring single source of truth for suspension enforcement
    -   **Complete Audit Logging:** Extended AccountStatusLog to capture ALL account status changes (ACTIVE↔DISABLED, ACTIVE↔SUSPENDED, DELETED) with oldStatus, newStatus, actorId, reason, and metadata
    -   **Self-Recovery Flow:** DISABLED users can reactivate their accounts via POST /api/me/enable, while SUSPENDED users require admin intervention
    -   **Defense-in-Depth:** Handler-level guards complement middleware enforcement to prevent status transition violations
    -   **Integration Tests:** Comprehensive test suite validates suspended users are blocked from messages, pitches, clubs, swaps, and rewards while active users proceed normally
-   **Streamlined Poll Creation:** Added genre filtering, search, and sort options to PitchBrowser. Implemented "Create Poll from Top Nominations" feature that auto-populates polls with the most nominated pitches, dramatically reducing manual work for club hosts.
-   **Comprehensive Audit Logging System:** Implemented full audit trail for rewards redemption with two new database tables:
    -   `RedemptionAuditLog`: Tracks all redemption status changes, badge grants, and admin actions with timestamps, reviewer info, reasons, and metadata
    -   `PointsAdjustmentLog`: Tracks all manual points adjustments by admins with amounts, reasons, timestamps, and optional metadata
    -   All redemption status changes (PENDING→APPROVED→FULFILLED, DECLINED, CANCELLED) automatically create audit entries
    -   Badge grants via reward approvals are logged with badgeCode and userId for compliance
-   **Admin Override Endpoints (STAFF-only):** Three new manual administration endpoints with full audit trail support:
    -   `POST /api/admin/rewards/badges/grant`: Manually grant badges to users with optional reason tracking
    -   `PATCH /api/admin/users/:id/points`: Adjust user points (positive or negative) with required reason, creates both PointsAdjustmentLog and PointLedger entries
    -   `POST /api/admin/rewards/grant`: Directly grant rewards to users bypassing the redemption flow, creates fulfilled redemption with zero points cost
-   **Audit Log Retrieval:** Two new query endpoints for compliance and review:
    -   `GET /api/admin/redemptions/:id/audit`: Retrieve complete audit history for a specific redemption
    -   `GET /api/admin/users/:id/points/history`: Retrieve points adjustment history for a user (last 100 entries)
-   **Enhanced PointType Enum:** Added `EARNED` and `SPENT` types for generic admin-initiated point transactions
-   **Unified Billing History:** Implemented comprehensive billing history feature for authors:
    -   Added `GET /api/billing/history` endpoint that combines subscription payments and credit purchases into a unified timeline
    -   Created Billing page showing current tier, credit balance, and complete transaction history with proper formatting
    -   Enhanced CreditTransaction schema with `amountPaidCents` field to persist actual Stripe payment amounts for accurate billing records
    -   Webhook integration stores `session.amount_total` from Stripe for credit purchases, supporting variable pricing across credit packages
    -   Billing history displays accurate dollar amounts for all transactions with type badges and status indicators

## Future Features / Backlog
**Planned for Later Sprints:**
-   **Club Badges:** Club-specific achievements and badges to display in the club room, rewarding club milestones, engagement, and participation.
-   **Advanced Poll Voting Parameters:** Allow hosts to configure polls with flexible voting rules including max votes per member (e.g., "vote for up to 3 books"), and tie-breaking rules (revote, host decides, random selection, or oldest submission wins).