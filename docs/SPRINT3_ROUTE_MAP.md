# Sprint-3 Messaging & Moderation Routes

**Created:** November 5, 2025  
**Status:** Backend Complete, Frontend Complete

## New API Endpoints

### Thread Management (`/api/threads/*`)

#### `GET /api/threads/mine`
**Purpose:** List all message threads for authenticated user  
**Auth:** Required  
**Response:** 
```typescript
{
  success: true,
  data: ThreadListItem[] // includes unreadCount, lastMessage, otherMembers
}
```
**Features:**
- Computes unread count dynamically (`COUNT(messages WHERE createdAt > member.lastReadAt)`)
- Returns other members for DM threads (excludes current user)
- Includes last message preview
- Supports both DIRECT and CLUB threads

---

#### `POST /api/threads`
**Purpose:** Create new message thread (DM or club thread)  
**Auth:** Required  
**Request Body:**
```typescript
{
  type: "DIRECT" | "CLUB",
  memberIds?: string[],  // For DIRECT: other user IDs
  clubId?: string        // For CLUB: club ID
}
```
**Response:** `{ success: true, data: MessageThread }`  
**Features:**
- RBAC: CLUB threads require club membership
- Auto-adds creator as member
- Validates member IDs for DIRECT threads
- Returns full thread with members

---

#### `GET /api/threads/:id/messages`
**Purpose:** Fetch messages in thread with pagination  
**Auth:** Required, must be thread member  
**Query Params:** `cursor` (message ID for pagination)  
**Response:**
```typescript
{
  success: true,
  data: {
    messages: Message[],     // Latest 50 messages
    nextCursor: string | null,
    thread: MessageThread
  }
}
```
**Features:**
- Cursor-based pagination (50 messages per page)
- RBAC: Only thread members can read messages
- Includes sender information
- Ordered newest first

---

#### `POST /api/threads/:id/read`
**Purpose:** Mark thread as read (update lastReadAt timestamp)  
**Auth:** Required, must be thread member  
**Response:** `{ success: true }`  
**Features:**
- Updates ThreadMember.lastReadAt to current time
- Used by frontend to clear unread count
- Idempotent operation

---

### Message Sending (`/api/threads/:id/messages`)

#### `POST /api/threads/:id/messages`
**Purpose:** Send message to thread  
**Auth:** Required, must be thread member  
**Request Body:**
```typescript
{
  content: string  // 1-2000 characters
}
```
**Response:** `{ success: true, data: Message }`  
**Middleware Stack:**
1. **Rate Limiting** (`sendRateLimit`):
   - 30 messages per 10 minutes (sliding window)
   - In-memory tracking with DB fallback
   - Returns 429 with error code `MESSAGE_RATE_LIMIT` if exceeded
2. **Moderation Filter** (`moderationFilter`):
   - Profanity detection (configurable word list)
   - Optional AI toxicity detection (OpenAI moderation API)
   - Returns 400 with error code `MESSAGE_PROFANITY` or `MESSAGE_TOXIC`
3. **Auto-indexing** (if AI enabled): Generates message embeddings
4. **Notifications**: Sends `message_received` email to thread members (excludes sender)

**Error Responses:**
- `429`: Rate limit exceeded (`MESSAGE_RATE_LIMIT`)
- `400`: Profanity detected (`MESSAGE_PROFANITY`)
- `400`: Toxic content detected (`MESSAGE_TOXIC`)
- `403`: Not a thread member
- `404`: Thread not found

---

### Moderation (`/api/messages/*` and `/api/moderation/*`)

#### `POST /api/messages/:id/report`
**Purpose:** Report message for moderation review  
**Auth:** Required  
**Request Body:**
```typescript
{
  reason: string  // 10-500 characters, why reporting
}
```
**Response:** `{ success: true, data: ModerationReport }`  
**Features:**
- Creates report with PENDING status
- Prevents duplicate reports (one per user per message)
- Does not notify message sender (privacy)
- Available to any authenticated user

---

#### `GET /api/moderation/queue`
**Purpose:** Get pending moderation reports (STAFF dashboard)  
**Auth:** Required, STAFF tier only  
**Response:**
```typescript
{
  success: true,
  data: ModerationQueueItem[]  // includes reporter, message, sender
}
```
**Features:**
- Returns only PENDING reports
- Ordered by creation date (oldest first)
- Includes full message and user context
- RBAC: 403 if not STAFF tier

---

#### `POST /api/moderation/review`
**Purpose:** Review moderation report and take action (STAFF only)  
**Auth:** Required, STAFF tier only  
**Request Body:**
```typescript
{
  reportId: string,
  action: "FLAG" | "CLEAR" | "DISMISS"
}
```
**Actions:**
- `FLAG`: Marks message as flagged, updates report to UPHELD
- `CLEAR`: Marks report as CLEARED (message OK)
- `DISMISS`: Marks report as DISMISSED (spurious report)
**Response:** `{ success: true }`  
**Features:**
- Updates report status
- If FLAG: sets Message.flaggedAt timestamp
- Transaction ensures consistency
- RBAC: 403 if not STAFF tier

---

## Frontend Routes

### User-Facing Pages

#### `/messages`
**Component:** `MessageList`  
**Purpose:** Thread list with unread counts  
**Features:**
- Shows DM and club threads
- Displays unread count badges
- Last message preview
- Links to thread detail

---

#### `/messages/:id`
**Component:** `MessageThread`  
**Purpose:** Chat interface for thread  
**Features:**
- Real-time message polling (5s interval)
- Send message input
- Auto-scroll to latest
- Mark as read on mount
- Report message button (removed for simplicity)

---

### Admin Pages

#### `/admin/moderation`
**Component:** `ModerationQueue`  
**Purpose:** STAFF moderation dashboard  
**Features:**
- List pending reports
- FLAG/CLEAR/DISMISS actions
- Shows reporter, message, reason
- Real-time queue updates

---

## Rate Limiting Implementation

**Middleware:** `apps/api/src/middleware/sendRateLimit.ts`

**Algorithm:** Sliding window (30 messages per 10 minutes)

**Storage:**
- Primary: In-memory Map (`userId -> timestamp[]`)
- Fallback: Database query if in-memory unavailable
- Cleanup: Automatically removes old timestamps

**Configuration:**
```typescript
RATE_LIMIT_WINDOW = 10 * 60 * 1000  // 10 minutes
RATE_LIMIT_MAX = 30                  // 30 messages
```

**Error Response:**
```json
{
  "success": false,
  "error": "Rate limit exceeded. Maximum 30 messages per 10 minutes.",
  "code": "MESSAGE_RATE_LIMIT",
  "retryAfter": 300  // seconds until oldest message expires
}
```

---

## Moderation Filter Implementation

**Middleware:** `apps/api/src/middleware/moderationFilter.ts`

**Two-Layer Detection:**

### Layer 1: Profanity Detection (Always Active)
- Word list: `apps/api/src/lib/profanityFilter.ts`
- Pattern matching with word boundaries
- Case-insensitive
- Returns `MESSAGE_PROFANITY` error code

### Layer 2: AI Toxicity Detection (Optional)
- Requires `OPENAI_API_KEY`
- Uses OpenAI moderation API
- Categories: hate, harassment, self-harm, sexual, violence
- Returns `MESSAGE_TOXIC` error code with detected categories

**Graceful Degradation:**
- If OpenAI unavailable: Only profanity filtering active
- Logs warning but doesn't fail request
- Server continues functioning without AI

**Error Response (Profanity):**
```json
{
  "success": false,
  "error": "Message contains inappropriate content",
  "code": "MESSAGE_PROFANITY"
}
```

**Error Response (AI Toxicity):**
```json
{
  "success": false,
  "error": "Message flagged as potentially toxic: hate, harassment",
  "code": "MESSAGE_TOXIC"
}
```

---

## Database Schema Summary

### New Models

**MessageThread:**
- `id` (serial PK)
- `type` (DIRECT | CLUB enum)
- `clubId` (FK to Club, nullable)
- `createdAt`

**ThreadMember:**
- Composite PK: `(threadId, userId)`
- `threadId` (FK to MessageThread)
- `userId` (FK to User)
- `joinedAt`
- `lastReadAt` (for unread count calculation)
- Index on `userId` for fast user queries

**Message:**
- `id` (serial PK)
- `threadId` (FK to MessageThread)
- `senderId` (FK to User)
- `content` (text)
- `createdAt`
- `flaggedAt` (nullable, set by moderation)
- Indexes on `threadId` and `createdAt` for pagination

**ModerationReport:**
- `id` (serial PK)
- `messageId` (FK to Message)
- `reporterId` (FK to User)
- `reason` (text)
- `status` (PENDING | UPHELD | CLEARED | DISMISSED enum)
- `createdAt`
- `reviewedAt` (nullable)
- Unique constraint on `(messageId, reporterId)` prevents duplicates

---

## Notification Integration

**Service:** Resend API  
**Template:** `message_received`

**Trigger:** POST `/api/threads/:id/messages` (after successful send)

**Recipients:** All thread members except sender

**Email Content:**
- Sender name
- Message preview (first 100 chars)
- Link to thread (`/messages/:threadId`)

**Implementation:** `apps/api/src/lib/mail.ts`

---

## Security & Authorization

### Thread Access Control
- Users can only create DM threads with valid user IDs
- Club threads require club membership
- Only thread members can read/send messages
- ThreadMember table enforces membership

### Moderation Access Control
- Anyone can report messages
- Only STAFF tier users can access moderation queue
- Only STAFF tier users can review reports
- Middleware enforces tier checks

### Rate Limiting
- Per-user enforcement (not global)
- Prevents spam and abuse
- Sliding window ensures fairness
- Returns clear error with retry time

### Content Filtering
- Automatic profanity rejection
- Optional AI toxicity detection
- Protects community standards
- Transparent error messages

---

## Testing Coverage

See `docs/SPRINT3_TEST_LOG.md` for acceptance test scenarios covering:
1. DM thread creation and messaging
2. Club thread RBAC enforcement
3. Rate limiting (31st message blocked)
4. Profanity filter rejection
5. AI toxicity detection (optional)
6. Message reporting workflow
7. STAFF review actions
8. Email notifications fired
