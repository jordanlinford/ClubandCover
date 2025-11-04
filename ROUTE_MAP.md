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

### Memberships
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/memberships` | Get user's memberships | Yes |
| POST | `/api/memberships` | Join club | Yes |
| PATCH | `/api/memberships/:id` | Update membership status | Yes |
| DELETE | `/api/memberships/:id` | Leave club | Yes |

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
