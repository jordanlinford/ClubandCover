# Book Club/Swap Application - Route Map

## Frontend Routes (Wouter)

| Path | Component | Description |
|------|-----------|-------------|
| `/` | HomePage | Landing page |
| `/auth/sign-in` | SignInPage | Supabase authentication - sign in |
| `/auth/sign-up` | SignUpPage | Supabase authentication - sign up |
| `/profile` | ProfilePage | User profile management |
| `/books` | BooksListPage | Browse all available books |
| `/books/new` | BookFormPage | Create new book listing |
| `/books/:id` | BookDetailPage | View book details + request swap |
| `/books/:id/edit` | BookFormPage | Edit existing book |
| `/clubs` | ClubsListPage | Browse book clubs |
| `/clubs/new` | ClubFormPage | Create new club |
| `/clubs/:id` | ClubDetailPage | View club details + join |
| `/clubs/:id/host-console` | HostConsolePage | Club management (owner/admin only) |
| `/clubs/:clubId/polls/:pollId` | VotePage | Vote on active polls |
| `/pitches` | PitchesListPage | Browse user's pitches |
| `/pitches/new` | NewPitchPage | Submit new book pitch |
| `/pitches/:id` | PitchDetailPage | View pitch details |
| `/swaps` | SwapsPage | Manage swap requests (sent/received tabs) |
| `/billing` | BillingPage | Subscription plans + Stripe checkout |

## API Routes (Fastify)

### Health & Meta
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check endpoint |

### Books
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/books` | List all books | No |
| GET | `/api/books/:id` | Get book details | No |
| POST | `/api/books` | Create book | Yes |
| PATCH | `/api/books/:id` | Update book (owner only) | Yes |
| DELETE | `/api/books/:id` | Delete book (owner only) | Yes |

### Clubs
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/clubs` | List all clubs | No |
| GET | `/api/clubs/:id` | Get club details | No |
| POST | `/api/clubs` | Create club | Yes |
| PATCH | `/api/clubs/:id` | Update club (owner/admin only) | Yes |
| DELETE | `/api/clubs/:id` | Delete club (owner only) | Yes |

### Memberships (Sprint-4 Enhanced)
| Method | Path | Description | Auth Required | Notes |
|--------|------|-------------|---------------|-------|
| GET | `/api/memberships` | Get user's memberships | Yes | - |
| POST | `/api/clubs/:id/join` | Request to join club | Yes | Respects `minPointsToJoin` rule |
| PATCH | `/api/memberships/:clubId/:userId` | Update membership (owner/admin only) | Yes | Can change status and role |
| DELETE | `/api/memberships/:clubId/:userId` | Remove member (owner/admin only) | Yes | - |

**Join Rules Enforcement:**
- If `club.minPointsToJoin > 0` and `user.points < club.minPointsToJoin` → returns 403
- New members start with status PENDING (require approval)
- On PENDING→ACTIVE transition, role defaults to MEMBER if not specified

### Swaps (Sprint-1 Enhanced)
| Method | Path | Description | Auth Required | State Machine |
|--------|------|-------------|---------------|---------------|
| GET | `/api/swaps` | List user's swaps (sent + received) | Yes | - |
| POST | `/api/swaps` | Create swap request | Yes | → REQUESTED |
| PATCH | `/api/swaps/:id` | Update swap status | Yes | See state transitions below |

**Swap State Machine:**
- REQUESTED → ACCEPTED (responder accepts)
- REQUESTED → DECLINED (responder declines)
- ACCEPTED → DELIVERED (responder ships book)
- ACCEPTED → DECLINED (either party cancels)
- DELIVERED → VERIFIED (requester confirms receipt)

**Tier Limits:**
- FREE: max 3 pending swaps (REQUESTED + ACCEPTED)
- PRO_AUTHOR: max 10 pending swaps
- PRO_CLUB/PUBLISHER: max 999 pending swaps

### Reviews (Sprint-1 New)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/reviews` | List reviews | No |
| POST | `/api/reviews` | Create review | Yes |
| GET | `/api/reviews/:id` | Get review details | No |

**Auto-created on VERIFIED:** When a swap reaches VERIFIED status, a verified review is automatically created (rating: 5, verifiedSwap: true).

### Billing (Sprint-1 Enhanced)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/billing/checkout-session` | Create Stripe checkout session | Yes |

**Request Body:** `{ plan: "PRO_AUTHOR" | "PRO_CLUB" | "PUBLISHER" }`  
**Response:** `{ success: true, data: { url: "https://checkout.stripe.com/..." } }`

### Webhooks (Sprint-1 New)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/webhooks/stripe` | Stripe webhook handler | No (signed) |

**Handled Events:**
- `checkout.session.completed` → Creates Payment record, upgrades user tier
- `customer.subscription.updated` → Updates user subscription status
- `customer.subscription.deleted` → Downgrades user tier to FREE

### AI & Discovery (Sprint-2 New)
| Method | Path | Description | Auth Required | Rate Limited |
|--------|------|-------------|---------------|--------------|
| POST | `/api/ai/generate-blurb` | Generate book description from title/author | Yes | Yes (FREE: 10/day, PRO_AUTHOR: 50/day) |
| POST | `/api/ai/index-one` | Generate embedding for single book/club | Yes | Yes |
| POST | `/api/ai/reindex` | Regenerate all embeddings (STAFF only) | Yes | Yes |
| POST | `/api/ai/match` | Find top 5 similar books/clubs | Yes | No |

**AI Rate Limits (Middleware: `aiRateLimit`):**
- FREE tier: 10 AI calls per day (resets daily)
- PRO_AUTHOR tier: 50 AI calls per day
- Returns `429` with code `AI_RATE_LIMIT` when exceeded

**Graceful Degradation:**
- Server starts without `OPENAI_API_KEY` (logs warning)
- All AI endpoints return `501 Not Implemented` when AI is disabled
- Auto-indexing on create/update only runs when AI is enabled

**Auto-Indexing:**
- Books: Embeddings generated automatically on POST `/api/books`
- Clubs: Embeddings generated automatically on POST `/api/clubs`

### Pitches (Sprint-4 New)
| Method | Path | Description | Auth Required | Notes |
|--------|------|-------------|---------------|-------|
| POST | `/api/pitches` | Create book pitch | Yes | Author submits pitch to clubs |
| GET | `/api/pitches` | List user's pitches | Yes | Returns author's pitches |
| GET | `/api/pitches/:id` | Get pitch details | Yes | - |
| PATCH | `/api/pitches/:id` | Update pitch | Yes | Author only |
| POST | `/api/clubs/:id/choose-book` | Select winning pitch | Yes | Owner/admin only, awards 100 points |

**Pitch Status:**
- PENDING: Awaiting club decision
- SELECTED: Chosen by club (author receives 100 points)
- DECLINED: Rejected by club

### Polls (Sprint-4 New)
| Method | Path | Description | Auth Required | Notes |
|--------|------|-------------|---------------|-------|
| POST | `/api/clubs/:id/polls` | Create poll | Yes | Owner/admin only |
| GET | `/api/clubs/:id/polls` | List club polls | Yes | Member only |
| GET | `/api/clubs/:clubId/polls/:pollId` | Get poll details with results | Yes | Member only |
| POST | `/api/clubs/:clubId/polls/:pollId/close` | Close poll | Yes | Owner/admin only |
| POST | `/api/polls/:id/options` | Add poll option | Yes | Owner/admin only |
| POST | `/api/polls/:pollId/vote` | Cast vote | Yes | Member only, one vote per user, awards 3 points |

**Poll Types:**
- PITCH: Vote on book pitches
- BOOK: Vote on existing books

**Vote Points:** Each vote earns user 3 points (VOTE_PARTICIPATION)

### Points (Sprint-4 New)
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/users/:id/points` | Get points summary (points + reputation) | Yes |
| GET | `/api/users/:id/ledger` | Get point transaction history | Yes |

**Point Values:**
- PITCH_SELECTED: 100 points (pitch chosen by club)
- SWAP_VERIFIED: 50 points (successful book swap)
- VOTE_PARTICIPATION: 3 points (cast vote in poll)

**Reputation Calculation:**
- Sum of all points earned across all events
- Displayed as badge on profile and throughout app
- Used to enforce join rules (club.minPointsToJoin)

## Authentication Flow

1. **Frontend:** User signs up/in via Supabase SDK (`/auth/sign-in`, `/auth/sign-up`)
2. **Session Storage:** Supabase stores JWT in localStorage
3. **API Requests:** Frontend sends `Authorization: Bearer <jwt>` header
4. **Backend Middleware:** `supabaseAuth` verifies JWT, extracts user info
5. **User Sync:** Backend auto-creates/updates user record in database

## Notification Events (Resend)

| Event | Trigger | Recipient |
|-------|---------|-----------|
| `swap_requested` | POST /api/swaps | Responder (book owner) |
| `swap_accepted` | PATCH /api/swaps (→ ACCEPTED) | Requester |
| `swap_declined` | PATCH /api/swaps (→ DECLINED) | Requester |
| `swap_delivered` | PATCH /api/swaps (→ DELIVERED) | Requester |
| `swap_verified` | PATCH /api/swaps (→ VERIFIED) | Both parties |

## Stripe Products & Prices

| Product | Stripe Product ID | Monthly Price |
|---------|-------------------|---------------|
| Pro Author | `prod_ProAuthor` | $9.99 |
| Pro Club | `prod_ProClub` | $19.99 |
| Publisher | `prod_Publisher` | $49.99 |

*Products are auto-created on server startup via `ensureStripeProducts()`*
