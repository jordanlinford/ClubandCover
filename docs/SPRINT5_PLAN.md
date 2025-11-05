# Sprint-5: Growth & Stickiness - Implementation Plan

**Status:** PENDING APPROVAL - DO NOT EXECUTE YET  
**Date:** November 5, 2025  
**Estimated Effort:** 12-16 hours

---

## 📋 Overview

Sprint-5 focuses on user acquisition, retention, and engagement through:
1. **Referral System** - Viral growth loop with incentives
2. **Notification System** - In-app + email notifications
3. **Discovery & Search** - Full-text search with filters
4. **Onboarding Checklists** - Guided user activation
5. **Author Analytics** - Lightweight engagement metrics
6. **Polish** - Error handling improvements from Sprint-4 feedback

---

## 🗂️ File Tree - All Additions/Changes

```
apps/api/
├── prisma/
│   ├── schema.prisma                      [MODIFIED] Add 4 new models + FTS index
│   └── migrations/
│       └── 20251105_sprint5_growth/       [NEW] Migration files
│           ├── migration.sql
│           └── fts_indexes.sql
├── src/
│   ├── routes/
│   │   ├── referrals.ts                   [NEW] Referral code management
│   │   ├── notifications.ts               [NEW] In-app notifications
│   │   ├── settings.ts                    [NEW] User notification settings
│   │   ├── discover.ts                    [NEW] Search & trending
│   │   ├── checklists.ts                  [NEW] Onboarding progress
│   │   ├── polls_full.ts                  [NEW] One-shot poll creation
│   │   ├── analytics.ts                   [NEW] Author metrics
│   │   ├── cron.ts                        [NEW] Cron job endpoints
│   │   ├── polls.ts                       [MODIFIED] Minor cleanup
│   │   └── index.ts                       [MODIFIED] Register new routes
│   ├── services/
│   │   ├── referrals.ts                   [NEW] Code generation, activation
│   │   ├── notifications.ts               [NEW] Dispatch logic
│   │   ├── email.ts                       [NEW] Email provider adapter
│   │   └── search.ts                      [NEW] Full-text search logic
│   ├── lib/
│   │   ├── points.ts                      [MODIFIED] Add REFERRAL_ACTIVATED events
│   │   └── cron-auth.ts                   [NEW] Cron key validation
│   └── types/
│       └── notifications.ts               [NEW] Notification types

apps/web/
├── src/
│   ├── pages/
│   │   ├── referrals/
│   │   │   └── ReferralDashboard.tsx      [NEW] Referral management
│   │   ├── discover/
│   │   │   └── Discover.tsx               [NEW] Search & trending
│   │   ├── onboarding/
│   │   │   └── Onboarding.tsx             [NEW] Role-based checklist
│   │   └── author/
│   │       └── Analytics.tsx              [NEW] Author engagement metrics
│   ├── components/
│   │   ├── NotificationBell.tsx           [NEW] Header notification icon
│   │   ├── NotificationList.tsx           [NEW] Notification dropdown
│   │   ├── SearchBar.tsx                  [NEW] Search input with filters
│   │   ├── TrendingGrid.tsx               [NEW] Trending items display
│   │   ├── ChecklistCard.tsx              [NEW] Onboarding checklist UI
│   │   ├── PollBuilderModal.tsx           [MODIFIED] Use one-shot endpoint
│   │   └── [All mutation components]      [MODIFIED] Add onError + pending states
│   ├── hooks/
│   │   ├── useNotifications.ts            [NEW] Real-time notification polling
│   │   └── useSearch.ts                   [NEW] Search state management
│   └── lib/
│       └── api.ts                         [MODIFIED] Add new API methods

packages/types/
└── src/
    ├── referral.ts                        [NEW] Referral types
    ├── notification.ts                    [NEW] Notification types
    ├── checklist.ts                       [NEW] Checklist types
    └── search.ts                          [NEW] Search types

docs/
├── SPRINT5_PLAN.md                        [NEW] This file
├── NOTIFICATIONS.md                       [NEW] Event triggers + templates
├── ROUTE_MAP.md                           [MODIFIED] Add Sprint-5 routes
├── TEST_LOG.md                            [MODIFIED] Add Sprint-5 test results
└── sprint-plan.md                         [MODIFIED] Mark Sprint-5 in progress

tests/ (if using separate test directory)
├── api/
│   ├── referrals.test.ts                  [NEW] Referral API tests
│   ├── notifications.test.ts              [NEW] Notification API tests
│   ├── discover.test.ts                   [NEW] Search API tests
│   ├── checklists.test.ts                 [NEW] Checklist API tests
│   └── polls_full.test.ts                 [NEW] One-shot poll tests
└── e2e/
    ├── referral.spec.ts                   [NEW] Referral flow E2E
    ├── notifications.spec.ts              [NEW] Notification flow E2E
    ├── discovery.spec.ts                  [NEW] Search flow E2E
    └── onboarding.spec.ts                 [NEW] Onboarding flow E2E
```

**Summary:**
- **New files:** 34
- **Modified files:** 9
- **Total changes:** 43 files

---

## 🗄️ Database Schema Changes

### Prisma Schema Diff

```prisma
// ============================================
// NEW ENUMS
// ============================================

enum ReferralStatus {
  ISSUED      // Code created, not yet claimed
  CLAIMED     // Someone signed up with code
  ACTIVATED   // Referee completed first meaningful action
  EXPIRED     // (Optional) Code expired after time limit
}

enum NotificationType {
  POLL_CREATED        // New poll in your club
  POLL_CLOSING        // Poll closes in 2h
  PITCH_ACCEPTED      // Your pitch was selected
  PITCH_REJECTED      // Your pitch was declined
  SWAP_DELIVERED      // Swap marked as delivered
  SWAP_VERIFIED       // Swap verified
  REFERRAL_ACTIVATED  // Your referral earned points
  POINTS_AWARDED      // You earned points
  MEMBERSHIP_APPROVED // Your club join request approved
  NEW_MESSAGE         // New message in thread
}

// ============================================
// NEW MODELS
// ============================================

model Referral {
  id           Int            @id @default(autoincrement())
  referrerId   String         // User who created the referral
  refereeId    String?        // User who signed up (null until claimed)
  code         String         @unique
  status       ReferralStatus @default(ISSUED)
  activatedAt  DateTime?      // When referee completed first action
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  
  referrer     User           @relation("ReferrerReferrals", fields: [referrerId], references: [id], onDelete: Cascade)
  referee      User?          @relation("RefereeReferrals", fields: [refereeId], references: [id], onDelete: SetNull)
  
  @@index([referrerId])
  @@index([code])
  @@index([status])
}

model Notification {
  id        Int              @id @default(autoincrement())
  userId    String
  type      NotificationType
  data      Json             // { pitchId?, pollId?, swapId?, pointsAmount?, etc }
  readAt    DateTime?
  createdAt DateTime         @default(now())
  
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, readAt])
  @@index([createdAt])
}

model UserSetting {
  userId              String  @id
  emailOptIn          Boolean @default(true)
  emailPollReminders  Boolean @default(true)
  emailSwapUpdates    Boolean @default(true)
  emailPointsUpdates  Boolean @default(false)
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  user                User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model ChecklistProgress {
  id        Int      @id @default(autoincrement())
  userId    String
  code      String   // "onboarding_reader", "onboarding_author", "onboarding_host"
  stepKey   String   // "create_profile", "join_club", "submit_pitch", etc
  doneAt    DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, code, stepKey])
  @@index([userId, code])
}

// ============================================
// MODIFIED MODELS
// ============================================

model User {
  // ... existing fields ...
  
  // NEW RELATIONS
  referralsGiven   Referral[]          @relation("ReferrerReferrals")
  referralsUsed    Referral[]          @relation("RefereeReferrals")
  notifications    Notification[]
  settings         UserSetting?
  checklistProgress ChecklistProgress[]
}

model Pitch {
  // ... existing fields ...
  
  // NEW FIELDS for analytics
  impressions      Int      @default(0)  // View count
  
  // NEW INDEX for full-text search (see SQL below)
}

model Club {
  // ... existing fields ...
  
  // NEW INDEX for full-text search (see SQL below)
}

model Book {
  // ... existing fields ...
  
  // NEW INDEX for full-text search (see SQL below)
}
```

### Migration SQL

**File: `apps/api/prisma/migrations/20251105_sprint5_growth/migration.sql`**

```sql
-- Create enums
CREATE TYPE "ReferralStatus" AS ENUM ('ISSUED', 'CLAIMED', 'ACTIVATED', 'EXPIRED');
CREATE TYPE "NotificationType" AS ENUM (
  'POLL_CREATED', 'POLL_CLOSING', 'PITCH_ACCEPTED', 'PITCH_REJECTED',
  'SWAP_DELIVERED', 'SWAP_VERIFIED', 'REFERRAL_ACTIVATED', 'POINTS_AWARDED',
  'MEMBERSHIP_APPROVED', 'NEW_MESSAGE'
);

-- Create Referral table
CREATE TABLE "Referral" (
  "id" SERIAL PRIMARY KEY,
  "referrerId" VARCHAR(255) NOT NULL,
  "refereeId" VARCHAR(255),
  "code" VARCHAR(50) UNIQUE NOT NULL,
  "status" "ReferralStatus" DEFAULT 'ISSUED',
  "activatedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX "Referral_referrerId_idx" ON "Referral"("referrerId");
CREATE INDEX "Referral_code_idx" ON "Referral"("code");
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- Create Notification table
CREATE TABLE "Notification" (
  "id" SERIAL PRIMARY KEY,
  "userId" VARCHAR(255) NOT NULL,
  "type" "NotificationType" NOT NULL,
  "data" JSONB NOT NULL,
  "readAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- Create UserSetting table
CREATE TABLE "UserSetting" (
  "userId" VARCHAR(255) PRIMARY KEY,
  "emailOptIn" BOOLEAN DEFAULT true,
  "emailPollReminders" BOOLEAN DEFAULT true,
  "emailSwapUpdates" BOOLEAN DEFAULT true,
  "emailPointsUpdates" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Create ChecklistProgress table
CREATE TABLE "ChecklistProgress" (
  "id" SERIAL PRIMARY KEY,
  "userId" VARCHAR(255) NOT NULL,
  "code" VARCHAR(100) NOT NULL,
  "stepKey" VARCHAR(100) NOT NULL,
  "doneAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  UNIQUE ("userId", "code", "stepKey")
);

CREATE INDEX "ChecklistProgress_userId_code_idx" ON "ChecklistProgress"("userId", "code");

-- Add impressions column to Pitch
ALTER TABLE "Pitch" ADD COLUMN "impressions" INTEGER DEFAULT 0;
```

**File: `apps/api/prisma/migrations/20251105_sprint5_growth/fts_indexes.sql`**

```sql
-- Full-text search indexes using PostgreSQL tsvector

-- Pitch FTS index
CREATE INDEX "Pitch_fts_idx" ON "Pitch" 
  USING GIN (to_tsvector('english', 
    title || ' ' || COALESCE(description, '')
  ));

-- Club FTS index (optional but recommended)
CREATE INDEX "Club_fts_idx" ON "Club" 
  USING GIN (to_tsvector('english', 
    name || ' ' || COALESCE(description, '') || ' ' || COALESCE(array_to_string(genres, ' '), '')
  ));

-- Book FTS index (optional but recommended)
CREATE INDEX "Book_fts_idx" ON "Book" 
  USING GIN (to_tsvector('english', 
    title || ' ' || COALESCE(author, '') || ' ' || COALESCE(synopsis, '') || ' ' || COALESCE(array_to_string(genres, ' '), '')
  ));
```

**Migration Strategy:**
1. Run `npx prisma migrate dev --name sprint5_growth`
2. Manually execute `fts_indexes.sql` via `execute_sql_tool` or psql
3. Verify indexes: `SELECT indexname FROM pg_indexes WHERE tablename IN ('Pitch', 'Club', 'Book');`

---

## 🔌 API Endpoint Contracts

### 1. Referrals (`/api/referrals`)

#### `POST /api/referrals`
**Description:** Create a new referral code for the current user

**Request:**
```typescript
// No body required
```

**Response:**
```typescript
{
  success: true,
  data: {
    id: 123,
    code: "ALICE-XY7K",
    url: "https://app.yourdomain.com/ref?code=ALICE-XY7K",
    status: "ISSUED",
    createdAt: "2025-11-05T12:00:00Z"
  }
}
```

**Errors:**
- 401: Unauthorized (not logged in)
- 429: Too many codes created (limit: 10 per user)

---

#### `POST /api/referrals/claim`
**Description:** Claim a referral code during sign-up (called by auth flow)

**Request:**
```typescript
{
  code: "ALICE-XY7K"
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    message: "Referral claimed successfully",
    referralId: 123
  }
}
```

**Errors:**
- 400: Invalid or expired code
- 409: Code already claimed by this user

---

#### `POST /api/referrals/:id/activate`
**Description:** Mark referral as activated (first meaningful action by referee)

**Request:**
```typescript
// No body - called internally by backend after action
```

**Response:**
```typescript
{
  success: true,
  data: {
    referralId: 123,
    pointsAwarded: {
      referrer: 50,
      referee: 25
    }
  }
}
```

**Logic:**
- Idempotent: Only awards points once per referral
- "Meaningful action" = create book, join club, or submit pitch
- Awards 50 points to referrer, 25 points to referee

---

#### `GET /api/referrals/mine`
**Description:** Get current user's referral history

**Response:**
```typescript
{
  success: true,
  data: {
    codes: [
      {
        id: 123,
        code: "ALICE-XY7K",
        status: "ACTIVATED",
        refereeId: "user_xyz",
        refereeName: "Bob Smith",
        activatedAt: "2025-11-05T14:00:00Z",
        pointsEarned: 50
      }
    ],
    stats: {
      totalCodes: 5,
      activated: 2,
      pending: 3,
      totalPointsEarned: 100
    }
  }
}
```

---

### 2. Notifications (`/api/notifications`)

#### `GET /api/notifications`
**Description:** Get current user's notifications (paginated)

**Query Params:**
- `page` (default: 1)
- `limit` (default: 20)
- `unreadOnly` (default: false)

**Response:**
```typescript
{
  success: true,
  data: {
    notifications: [
      {
        id: 456,
        type: "POLL_CLOSING",
        data: {
          pollId: 12,
          pollTitle: "November Book Selection",
          clubId: 5,
          clubName: "Sci-Fi Lovers",
          closesAt: "2025-11-05T16:00:00Z"
        },
        readAt: null,
        createdAt: "2025-11-05T14:00:00Z"
      }
    ],
    pagination: {
      total: 45,
      page: 1,
      limit: 20,
      hasMore: true
    },
    unreadCount: 12
  }
}
```

---

#### `POST /api/notifications/:id/read`
**Description:** Mark notification as read

**Response:**
```typescript
{
  success: true,
  data: {
    id: 456,
    readAt: "2025-11-05T14:30:00Z"
  }
}
```

---

#### `POST /api/notifications/read-all`
**Description:** Mark all notifications as read

**Response:**
```typescript
{
  success: true,
  data: {
    markedCount: 12
  }
}
```

---

### 3. Settings (`/api/settings`)

#### `GET /api/settings/notifications`
**Description:** Get user's notification preferences

**Response:**
```typescript
{
  success: true,
  data: {
    emailOptIn: true,
    emailPollReminders: true,
    emailSwapUpdates: true,
    emailPointsUpdates: false
  }
}
```

---

#### `PATCH /api/settings/notifications`
**Description:** Update notification preferences

**Request:**
```typescript
{
  emailOptIn?: boolean,
  emailPollReminders?: boolean,
  emailSwapUpdates?: boolean,
  emailPointsUpdates?: boolean
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    emailOptIn: false,
    emailPollReminders: true,
    emailSwapUpdates: true,
    emailPointsUpdates: false
  }
}
```

---

### 4. Discover (`/api/discover`)

#### `GET /api/discover/search`
**Description:** Full-text search across pitches, clubs, books

**Query Params:**
- `q` (required): Search query
- `type`: Filter by type ("pitch", "club", "book", or omit for all)
- `genres`: Comma-separated genres filter
- `minPoints`: Minimum club join points
- `page` (default: 1)
- `limit` (default: 20)

**Response:**
```typescript
{
  success: true,
  data: {
    results: [
      {
        type: "pitch",
        id: 89,
        title: "The Quantum Garden",
        authorName: "Alice Chen",
        snippet: "A thrilling sci-fi adventure...",
        genres: ["sci-fi", "thriller"],
        relevance: 0.92
      },
      {
        type: "club",
        id: 12,
        name: "Sci-Fi Enthusiasts",
        snippet: "We love hard sci-fi...",
        memberCount: 45,
        minPointsToJoin: 0,
        relevance: 0.87
      }
    ],
    pagination: {
      total: 156,
      page: 1,
      limit: 20,
      hasMore: true
    }
  }
}
```

---

#### `GET /api/discover/trending`
**Description:** Get trending pitches and clubs

**Query Params:**
- `type`: "pitch" or "club"
- `limit` (default: 10)

**Response:**
```typescript
{
  success: true,
  data: {
    pitches: [
      {
        id: 89,
        title: "The Quantum Garden",
        authorName: "Alice Chen",
        impressions: 234,
        voteCount: 45,
        trendingScore: 8.7
      }
    ],
    clubs: [
      {
        id: 12,
        name: "Sci-Fi Enthusiasts",
        memberCount: 45,
        recentActivity: 23,
        trendingScore: 9.2
      }
    ]
  }
}
```

**Trending Score Logic:**
```
pitch_score = (impressions * 0.3) + (votes * 5) + (age_penalty)
club_score = (member_count * 0.5) + (recent_polls * 10) + (recent_messages * 2)
age_penalty = -1 point per day old
```

---

### 5. Checklists (`/api/checklists`)

#### `GET /api/checklists/:code`
**Description:** Get checklist definition and user progress

**Params:**
- `code`: "onboarding_reader", "onboarding_author", "onboarding_host"

**Response:**
```typescript
{
  success: true,
  data: {
    code: "onboarding_author",
    title: "Author Onboarding",
    steps: [
      {
        key: "create_profile",
        title: "Complete your profile",
        description: "Add bio and avatar",
        done: true,
        doneAt: "2025-11-05T12:00:00Z"
      },
      {
        key: "submit_pitch",
        title: "Submit your first pitch",
        description: "Share your book with clubs",
        done: false,
        doneAt: null
      },
      {
        key: "join_club",
        title: "Join a book club",
        description: "Find your community",
        done: false,
        doneAt: null
      }
    ],
    progress: {
      completed: 1,
      total: 3,
      percentage: 33
    }
  }
}
```

---

#### `POST /api/checklists/:code/steps/:stepKey/done`
**Description:** Mark a checklist step as done

**Response:**
```typescript
{
  success: true,
  data: {
    stepKey: "submit_pitch",
    doneAt: "2025-11-05T14:30:00Z",
    newProgress: {
      completed: 2,
      total: 3,
      percentage: 67
    }
  }
}
```

**Note:** Backend auto-marks steps when actions occur:
- `create_profile` → User updates bio/avatar
- `submit_pitch` → User creates first pitch
- `join_club` → User joins first club
- `cast_vote` → User votes in first poll
- etc.

---

### 6. One-Shot Poll Builder (`/api/clubs/:clubId/polls/full`)

#### `POST /api/clubs/:clubId/polls/full`
**Description:** Create poll with options in one transaction (replaces multi-step poll creation)

**Request:**
```typescript
{
  title: "November Book Selection",
  description: "Vote for next month's read",
  type: "PITCH",
  options: [
    { pitchId: 12 },
    { pitchId: 15 },
    { pitchId: 18 }
  ]
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    poll: {
      id: 34,
      clubId: 5,
      title: "November Book Selection",
      type: "PITCH",
      isActive: true,
      createdAt: "2025-11-05T14:00:00Z"
    },
    options: [
      { id: 101, pollId: 34, pitchId: 12, votesCount: 0 },
      { id: 102, pollId: 34, pitchId: 15, votesCount: 0 },
      { id: 103, pollId: 34, pitchId: 18, votesCount: 0 }
    ]
  }
}
```

**Advantages over old approach:**
- Atomic transaction (all or nothing)
- Single API call (faster, simpler)
- Easier error handling

---

### 7. Author Analytics (`/api/analytics/author`)

#### `GET /api/analytics/author`
**Description:** Get current author's pitch analytics

**Response:**
```typescript
{
  success: true,
  data: {
    pitches: [
      {
        id: 89,
        title: "The Quantum Garden",
        status: "SUBMITTED",
        impressions: 234,
        pollInclusions: 5,
        totalVotes: 45,
        wins: 1,
        createdAt: "2025-10-15T10:00:00Z"
      }
    ],
    totals: {
      pitchesSubmitted: 12,
      totalImpressions: 3456,
      totalVotes: 567,
      totalWins: 3,
      conversionRate: 0.25 // wins / submissions
    }
  }
}
```

---

### 8. Cron Jobs (`/api/admin/cron`)

#### `POST /api/admin/cron/poll-reminders`
**Description:** Send reminders for polls closing in 2 hours

**Headers:**
```
Authorization: Bearer <CRON_KEY>
```

**Response:**
```typescript
{
  success: true,
  data: {
    pollsChecked: 45,
    remindersSent: 12,
    errors: []
  }
}
```

**Logic:**
1. Find polls with `closesAt` between now and 2h from now
2. Find users who voted vs haven't voted
3. Send POLL_CLOSING notification to members who haven't voted
4. Queue email if user has `emailPollReminders: true`

**Cron Schedule:** Every 15 minutes via external cron service (cron-job.org, GitHub Actions, etc)

---

## 🧪 Test Matrix

### API Tests (Vitest + Supertest)

| Test File | Scenarios | Priority |
|-----------|-----------|----------|
| **referrals.test.ts** | - Create referral code<br>- Claim code on sign-up<br>- Activate referral (idempotent)<br>- Get referral history<br>- Prevent duplicate claims<br>- Reject invalid codes | HIGH |
| **notifications.test.ts** | - Create notification<br>- Get paginated notifications<br>- Mark as read<br>- Mark all as read<br>- Filter unread only<br>- Delete old notifications | HIGH |
| **discover.test.ts** | - Search pitches by keyword<br>- Search clubs by genre<br>- Filter by minPoints<br>- Pagination<br>- Trending calculation<br>- Empty results | MEDIUM |
| **checklists.test.ts** | - Get checklist definition<br>- Mark step done<br>- Prevent duplicate marks<br>- Auto-mark on action<br>- Progress calculation | MEDIUM |
| **polls_full.test.ts** | - Create poll + options atomically<br>- Rollback on error<br>- Validate option types<br>- Permission check | HIGH |
| **settings.test.ts** | - Get settings (creates defaults)<br>- Update settings<br>- Partial update | LOW |
| **analytics.test.ts** | - Get author analytics<br>- Calculate conversion rate<br>- Filter by date range | LOW |

**Total API Tests:** ~40-50 test cases

---

### E2E Tests (Playwright)

| Test File | User Flow | Steps |
|-----------|-----------|-------|
| **referral.spec.ts** | Referral loop | 1. User A creates code<br>2. Copy code URL<br>3. Sign up as User B with code<br>4. User B submits pitch (activation)<br>5. Verify points awarded to both |
| **notifications.spec.ts** | Notification flow | 1. Create poll as owner<br>2. Check member sees POLL_CREATED<br>3. Mark as read<br>4. Verify unread count decreases |
| **discovery.spec.ts** | Search & filter | 1. Navigate to /discover<br>2. Search "sci-fi"<br>3. Apply genre filter<br>4. Check results<br>5. Click trending tab |
| **onboarding.spec.ts** | Guided activation | 1. Sign up as new author<br>2. See onboarding checklist<br>3. Complete profile (step 1)<br>4. Submit pitch (step 2)<br>5. Verify progress updates |
| **author-analytics.spec.ts** | Analytics visibility | 1. Sign in as author<br>2. Navigate to /author/analytics<br>3. Verify pitch impressions<br>4. Check conversion rate |

**Total E2E Tests:** ~20-25 test cases

---

## ⚠️ Risk & Edge Case Analysis

### 1. Referral System Risks

**Risk:** Referral fraud (self-referrals, bot sign-ups)
- **Mitigation:** 
  - IP tracking to detect same-IP referrals
  - Email verification required before code claim
  - Activation requires meaningful action (not just sign-up)
  - Rate limit: Max 10 referral codes per user

**Risk:** Expired codes not claimed
- **Mitigation:**
  - Optional: Add `expiresAt` field (30 days)
  - Status: EXPIRED for unclaimed codes after time limit
  - Clean up expired codes via cron job

**Edge Case:** User signs up without code, later tries to claim
- **Decision:** Allow retroactive claim within 24h of sign-up
- **Implementation:** Check user.createdAt in claim endpoint

---

### 2. Notification System Risks

**Risk:** Notification spam (too many notifications)
- **Mitigation:**
  - Batch similar notifications (e.g., "3 new poll votes" instead of 3 separate)
  - User settings to disable specific types
  - Rate limit: Max 50 notifications per user per day

**Risk:** Email deliverability
- **Mitigation:**
  - Use reputable provider (Resend/SendGrid)
  - Verify sender domain (SPF, DKIM, DMARC)
  - Respect user opt-out (emailOptIn: false)
  - Implement bounce handling

**Edge Case:** Notification for deleted entity (e.g., poll deleted after notification sent)
- **Decision:** Show notification but disable link if entity not found
- **Implementation:** Add `isValid` flag based on entity existence

---

### 3. Full-Text Search Risks

**Risk:** Search performance on large datasets
- **Mitigation:**
  - GIN indexes for fast FTS
  - Pagination (max 100 results per page)
  - Cache trending results (5-minute TTL)
  - Consider Elasticsearch for 100k+ records

**Risk:** Search quality (irrelevant results)
- **Mitigation:**
  - Use PostgreSQL ranking (`ts_rank`)
  - Boost exact matches
  - Filter out archived/deleted entities
  - A/B test ranking algorithms

**Edge Case:** Search query with special characters (&, |, !)
- **Decision:** Sanitize query before `to_tsquery()`
- **Implementation:** Use `plainto_tsquery()` instead (handles special chars)

---

### 4. Checklist System Risks

**Risk:** Checklist step marked multiple times
- **Mitigation:** Unique constraint on `(userId, code, stepKey)`
- **Implementation:** Use `INSERT ... ON CONFLICT DO NOTHING`

**Risk:** Custom checklist definitions (different per user type)
- **Mitigation:**
  - Define checklists in code (not DB)
  - Map user.role to checklist code
  - READER → onboarding_reader
  - AUTHOR → onboarding_author
  - CLUB_ADMIN → onboarding_host

**Edge Case:** User completes action before seeing checklist
- **Decision:** Retroactively mark step as done
- **Implementation:** Check action history when loading checklist

---

### 5. Cron Job Risks

**Risk:** Cron job runs twice (duplicate reminders)
- **Mitigation:**
  - Idempotent logic (check if reminder already sent)
  - Store `lastReminderSentAt` on Poll model
  - Only send if `lastReminderSentAt IS NULL OR lastReminderSentAt < closesAt - 2h`

**Risk:** Cron key leaked (unauthorized access)
- **Mitigation:**
  - Strong random key (64 chars)
  - Rotate key if compromised
  - Rate limit cron endpoints (max 1 req/min)
  - Log all cron requests with IP

**Edge Case:** Cron job fails (network error, timeout)
- **Decision:** Retry with exponential backoff
- **Implementation:** External cron service handles retries

---

### 6. One-Shot Poll Creation Risks

**Risk:** Transaction rollback on partial failure
- **Mitigation:**
  - Prisma transaction wrapping all operations
  - All-or-nothing: Poll + all options created together
  - Clear error messages on validation failure

**Risk:** Invalid option references (pitchId/bookId not found)
- **Mitigation:**
  - Validate all IDs before transaction
  - Return 400 with specific error: "Pitch #12 not found"

**Edge Case:** Duplicate options (same pitchId twice)
- **Decision:** Allow (some polls may want same book multiple times)
- **Alternative:** Add unique validation if this is a bug

---

### 7. Email Provider Risks

**Risk:** Provider outage (Resend/SendGrid down)
- **Mitigation:**
  - Graceful degradation (in-app notifications still work)
  - Queue emails in DB for retry
  - Fallback to second provider (optional)

**Risk:** Email bounce rate too high (spam folder)
- **Mitigation:**
  - Clear unsubscribe link in every email
  - Monitor bounce rate
  - Clean email list (remove bounces)
  - Use transactional email templates (not marketing)

---

## 📝 Environment Variables Checklist

Add these to your `.env` file:

```bash
# ============================================
# EMAIL PROVIDER
# ============================================
EMAIL_PROVIDER=resend                          # Options: "resend" | "sendgrid"
EMAIL_PROVIDER_API_KEY=re_xxxxxxxxxxxxxxxx    # Resend API key
EMAIL_FROM="Book Pitch <no-reply@yourdomain.com>"

# ============================================
# REFERRAL SYSTEM
# ============================================
REFERRAL_BASE_URL=https://app.yourdomain.com/ref   # Base URL for referral links
# (Frontend will append ?code=ALICE-XY7K)

# ============================================
# CRON AUTHENTICATION
# ============================================
CRON_KEY=your-strong-random-key-64-chars-long-abc123xyz789
# Generate with: openssl rand -hex 32

# ============================================
# CORS (if frontend on different domain)
# ============================================
CORS_ORIGIN=https://your-frontend-domain.com   # Optional, defaults to same origin

# ============================================
# OPTIONAL: Email Testing (Development)
# ============================================
MAILTRAP_API_KEY=xxxxx                         # For email testing in dev
EMAIL_DEBUG=true                               # Log emails instead of sending
```

**Critical:**
- `EMAIL_PROVIDER_API_KEY` - Get from [Resend](https://resend.com/api-keys) (free tier: 100/day)
- `CRON_KEY` - Generate strong random key
- `REFERRAL_BASE_URL` - Set to production domain

**Optional:**
- `CORS_ORIGIN` - Only needed if frontend is on different domain
- `EMAIL_DEBUG` - Set to `true` in development to skip sending

---

## 📅 Implementation Roadmap

### Phase 1: Backend Foundation (4-5 hours)
1. ✅ Prisma migration (schema + FTS indexes)
2. ✅ Services layer (referrals, notifications, email, search)
3. ✅ API routes (referrals, notifications, settings, discover, checklists, polls_full)
4. ✅ Cron endpoints with auth
5. ✅ Points service updates (REFERRAL_ACTIVATED)

### Phase 2: Frontend Components (3-4 hours)
1. ✅ NotificationBell + NotificationList
2. ✅ ReferralDashboard page
3. ✅ Discover page (SearchBar + TrendingGrid)
4. ✅ Onboarding page (ChecklistCard)
5. ✅ Author Analytics page
6. ✅ Update PollBuilderModal to use one-shot endpoint

### Phase 3: Polish & Error Handling (2-3 hours)
1. ✅ Add `onError` to all mutations
2. ✅ Wire pending states to disable buttons
3. ✅ Toast notifications for success/error
4. ✅ Loading skeletons

### Phase 4: Testing (3-4 hours)
1. ✅ API tests (5 test files)
2. ✅ E2E tests (5 spec files)
3. ✅ Manual QA flows

### Phase 5: Documentation (1 hour)
1. ✅ Update ROUTE_MAP.md
2. ✅ Update TEST_LOG.md
3. ✅ Create NOTIFICATIONS.md
4. ✅ Update sprint-plan.md

**Total Estimated Time:** 12-16 hours

---

## 🚦 Go/No-Go Decision Points

Before starting implementation, confirm:

- [ ] **Database:** You're okay with 4 new models + FTS indexes
- [ ] **Email Provider:** You have Resend API key (or willing to use SendGrid)
- [ ] **Cron Jobs:** You can set up external cron (cron-job.org, GitHub Actions, etc)
- [ ] **Frontend Polish:** You want to refactor PollBuilderModal (breaking change)
- [ ] **Scope:** 43 file changes is acceptable for this sprint

**Alternative: Reduced Scope Sprint-5**
If full scope is too large, we can split into:
- **Sprint-5A:** Referrals + Notifications only (core retention)
- **Sprint-5B:** Discovery + Analytics (growth features)
- **Sprint-5C:** Polish + Testing (quality improvements)

---

## 📊 Success Metrics

After Sprint-5 implementation, we should be able to measure:

**Acquisition:**
- Referral conversion rate (claims / codes created)
- Referral activation rate (activated / claimed)

**Engagement:**
- Notification open rate (read / sent)
- Search usage (searches / DAU)
- Onboarding completion rate (100% / signups)

**Retention:**
- Week 1 retention (users active after 7 days)
- Poll participation rate (votes / poll views)

---

## ✅ Approval Checklist

Please review and approve:

- [ ] **Database schema** - 4 new models acceptable
- [ ] **API contracts** - Endpoints match requirements
- [ ] **Test coverage** - 60-75 test cases sufficient
- [ ] **Risks addressed** - Edge cases handled
- [ ] **ENV variables** - Can provide required keys
- [ ] **Timeline** - 12-16 hours realistic

**Once approved, I will:**
1. Create task list with all implementation steps
2. Execute in order: Backend → Frontend → Tests → Docs
3. Run architect review after each major phase
4. Deliver complete Sprint-5 with test results

---

**WAITING FOR YOUR APPROVAL TO PROCEED** 🚦
