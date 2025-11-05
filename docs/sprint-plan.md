# BookPitch – Sprint Plan (Living Doc)

**Owner:** Jordan (Vision) • **PM/SM:** ChatGPT • **Lead Dev:** Replit Agent  
**Repo:** Monorepo (apps/web, apps/api, packages/…) • **Env:** Replit (single port 5000), Supabase, Stripe, Resend

---

## High-Level Roadmap

- ✅ **Sprint 0 – Infrastructure & Seed**
  - Monorepo (pnpm), React/Vite/Tailwind, Fastify/Prisma/Zod
  - Single-port serve (API + built web), seed data
  - **Status:** Completed (date: November 2025)

- ✅ **Sprint 1 – Live Auth + Swap + Tiers + Billing**
  - Supabase auth (frontend + backend), swap lifecycle (REQUESTED→ACCEPTED→DELIVERED→VERIFIED)
  - Tier limits (FREE=3, PRO_AUTHOR=10), Stripe checkout + webhook, notify() w/ Resend
  - **Status:** Completed (date: November 4, 2025) • **Test log:** see `docs/TEST_LOG.md`

- ✅ **Sprint 2 – AI & Discovery**
  - Blurb generator, embeddings, book↔club matching, AI rate limits, anonymous user support
  - **Status:** Completed (date: November 4, 2025) • **Test log:** see `docs/TEST_LOG.md` Sprint-2 section
  - **Implementation:** Backend + Frontend UI complete (GenerateBlurbButton, RecommendedMatches, AIDisabledBanner, enhanced forms)

- ✅ **Sprint 3 – Messaging & Moderation**
  - In-app threads, report/moderation queue, AI toxicity detection
  - **Status:** Completed (date: November 4, 2025) • **Test log:** see `docs/TEST_LOG.md` Sprint-3 section

- ✅ **Sprint 4 – Pitches, Voting, and Points**
  - Author pitch submissions, club voting polls, points/reputation system, join rules
  - **Status:** Completed (date: November 5, 2025) • **Test log:** see `docs/TEST_LOG.md` Sprint-4 section

- ⏳ **Sprint 5 – Analytics & Admin**
  - Admin KPIs (MAU, swaps→reviews, upgrades), audit logs

- ⏳ **Sprint 6 – Launch & Scale**
  - QA hardening, production deploy, onboarding emails, marketing page

---

## Current Sprint (S5) – Analytics & Admin

**Goal:** Provide admin tools for platform insights and management.

**Deliverables** (Upcoming)
- Admin KPIs dashboard (MAU, active swaps, conversion rate)
- Audit logs for critical actions
- Platform health monitoring

**Status:** Planning phase

---

## Engineering Ground Rules

**Envs (Replit Secrets)**  
`SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, VITE_STRIPE_PUBLIC_KEY, RESEND_API_KEY (opt), OPENAI_API_KEY (opt)`

**Run Commands**
- Dev (Replit): `pnpm dev:replit`
- Local dual-port (if used): `pnpm dev:local`
- Prisma: `pnpm -F @apps/api prisma migrate dev`
- Seed: `pnpm seed`

**Debug**
- Config health: `GET /api/debug/config` → booleans (no secrets)
- Health: `GET /api/health`

**Change Control**
- All inputs/outputs Zod-validated (shared types in `@repo/types`)
- Mount **API under `/api/*`**; serve web at `/`
- Keep `ensureUser()` syncing Supabase `jwt.sub → User.id`

---

## Definition of Done (per sprint)

- All acceptance tests pass (recorded in `docs/TEST_LOG.md`)
- `docs/ROUTE_MAP.md` updated (frontend + API)
- Security pass: secrets not logged, role/tier guards enforced
- Minimal e2e flow recorded (steps + screenshots if relevant)
- Changelog appended below

---

## Quick QA Checklist (always run)

- `/api/debug/config` → all `true` (except optional keys)
- Auth: Sign up/in works, `User` upserted, role/tier correct
- Swap: REQUESTED→ACCEPTED→DELIVERED→VERIFIED, verified review appears
- Tier: FREE blocks 4th pending (403 `SWAP_LIMIT`); upgrade lifts cap
- Billing: checkout URL; webhook updates `User.tier`
- Email: notifications log or send (depending on `RESEND_API_KEY`)
- AI (when present): blurb, index, match, rate limit, graceful off

---

## Changelog

- **Sprint 4 (Nov 5, 2025)** – Pitches, Voting, and Points complete:
  - ✅ Database schema: Pitch, Poll, PollOption, Vote, PointLedger models
  - ✅ Points service with events: PITCH_SELECTED (100), SWAP_VERIFIED (50), VOTE_PARTICIPATION (3)
  - ✅ Pitches API: Create, list, update, select winning pitch
  - ✅ Polls API: Create poll, add options, vote (one vote per user), close poll
  - ✅ Membership join rules: Enforce minPointsToJoin requirement
  - ✅ Frontend components: PitchCard, PitchForm, VotePanel, PointsBadge, PollBuilderModal, PermissionGate
  - ✅ Frontend pages: pitches/List, pitches/New, pitches/Detail, clubs/HostConsole, clubs/Vote
  - ✅ Profile page enhanced with points display, reputation badge, ledger table
  - ✅ Route registration and type definitions
- **Sprint 3 (Nov 4, 2025)** – Messaging & Moderation complete:
  - ✅ Message threads API with Prisma models
  - ✅ AI toxicity detection with OpenAI moderation
  - ✅ Moderation queue for staff review
  - ✅ Frontend: MessageList, MessageThread, ModerationQueue pages
- **Sprint 2 (Nov 4, 2025)** – AI & Discovery complete:
  - ✅ OpenAI integration (GPT-4o-mini for blurbs, text-embedding-3-small for embeddings)
  - ✅ 4 AI endpoints: generate-blurb, index-one, reindex, match
  - ✅ Database: genres[], subtitle, embedding support for books+clubs, AI usage tracking
  - ✅ AI rate limiting: ANONYMOUS 3/day (IP-based), FREE 10/day, PRO_AUTHOR 50/day (user-based)
  - ✅ Auto-indexing on book/club create
  - ✅ Graceful degradation when OPENAI_API_KEY not configured
  - ✅ Frontend UI: GenerateBlurbButton (loading/error states, ≤120 word truncation)
  - ✅ Frontend UI: RecommendedMatches component (top 5 with % scores + explanations)
  - ✅ Frontend UI: AIDisabledBanner component
  - ✅ Frontend UI: BookForm enhanced (subtitle, genres, AI blurb button)
  - ✅ Frontend UI: ClubForm enhanced (genres field)
  - ✅ Frontend UI: BookDetail/ClubDetail enhanced (recommended matches panels)
  - ✅ Anonymous user support (IP-based rate limiting for AI features)
- **Sprint 1 (Nov 4, 2025)** – Live auth + swap + tiers + Stripe + email. Test log added.
- **Sprint 0 (Nov 2025)** – Monorepo, single-port serve, seed, base routes.
