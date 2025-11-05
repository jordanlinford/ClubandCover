# Sprint-3 Acceptance Test Plan

**Created:** November 5, 2025  
**Status:** Ready for Playwright E2E Testing

## Test Environment Setup

**Preconditions:**
- PostgreSQL database with Sprint-3 schema applied
- `OPENAI_API_KEY` configured (for AI toxicity tests)
- `RESEND_API_KEY` configured (for email notification tests)
- Test users created with different tiers:
  - `user1@test.com` (FREE tier)
  - `user2@test.com` (FREE tier)
  - `staff@test.com` (STAFF tier)

**Test Data Cleanup:**
- Run before each scenario to ensure clean state
- Delete all MessageThreads, Messages, ModerationReports
- Reset rate limit tracking (in-memory cleared on restart)

---

## Scenario 1: Direct Message Thread Creation and Messaging

**User Story:** As a user, I want to send direct messages to another user

**Steps:**
1. [Auth] Sign in as `user1@test.com`
2. [API] POST `/api/threads` with `{ type: "DIRECT", memberIds: ["user2_id"] }`
3. [Verify] Response status 200, thread created with type=DIRECT
4. [API] POST `/api/threads/:threadId/messages` with `{ content: "Hello from user1!" }`
5. [Verify] Response status 200, message created
6. [API] GET `/api/threads/mine`
7. [Verify] Thread appears in list with unreadCount=0 for user1
8. [Auth] Sign in as `user2@test.com`
9. [API] GET `/api/threads/mine`
10. [Verify] Thread appears with unreadCount=1
11. [API] GET `/api/threads/:threadId/messages`
12. [Verify] Message visible with content="Hello from user1!"
13. [API] POST `/api/threads/:threadId/messages` with `{ content: "Hi back!" }`
14. [Verify] Response status 200
15. [API] POST `/api/threads/:threadId/read`
16. [Verify] Response status 200
17. [API] GET `/api/threads/mine`
18. [Verify] Thread now shows unreadCount=0

**Expected Results:**
✅ Direct threads created successfully  
✅ Messages sent and received  
✅ Unread counts computed correctly  
✅ Mark as read updates unread count  

**Status:** ⏸️ Pending Playwright E2E

---

## Scenario 2: Club Thread RBAC Enforcement

**User Story:** As a system, I must enforce that only club members can access club threads

**Steps:**
1. [Auth] Sign in as `user1@test.com`
2. [API] POST `/api/clubs` to create a test club (user1 becomes OWNER)
3. [API] POST `/api/threads` with `{ type: "CLUB", clubId: "club_id" }`
4. [Verify] Response status 200, club thread created
5. [API] POST `/api/threads/:threadId/messages` with `{ content: "Club message" }`
6. [Verify] Response status 200
7. [Auth] Sign in as `user2@test.com` (NOT a club member)
8. [API] GET `/api/threads/:threadId/messages`
9. [Verify] Response status 403 (Forbidden)
10. [API] POST `/api/threads/:threadId/messages` with `{ content: "Attempt" }`
11. [Verify] Response status 403
12. [Auth] Sign in as `user1@test.com`
13. [API] POST `/api/clubs/:clubId/join` as user2 to join club
14. [Auth] Sign in as `user2@test.com`
15. [API] GET `/api/threads/:threadId/messages`
16. [Verify] Response status 200, messages visible
17. [API] POST `/api/threads/:threadId/messages` with `{ content: "Now I can send" }`
18. [Verify] Response status 200

**Expected Results:**
✅ Non-members cannot read club thread messages (403)  
✅ Non-members cannot send club thread messages (403)  
✅ After joining club, user gains access  
✅ RBAC enforced at thread membership level  

**Status:** ⏸️ Pending Playwright E2E

---

## Scenario 3: Rate Limiting (31st Message Blocked)

**User Story:** As a system, I must prevent spam by limiting users to 30 messages per 10 minutes

**Steps:**
1. [Auth] Sign in as `user1@test.com`
2. [API] POST `/api/threads` to create DM thread with user2
3. [Loop] Send 30 messages rapidly:
   - POST `/api/threads/:threadId/messages` with `{ content: "Message {i}" }` (i=1..30)
   - [Verify] All return status 200
4. [API] POST `/api/threads/:threadId/messages` with `{ content: "Message 31" }`
5. [Verify] Response status 429
6. [Verify] Error response contains:
   - `code: "MESSAGE_RATE_LIMIT"`
   - `error: "Rate limit exceeded. Maximum 30 messages per 10 minutes."`
   - `retryAfter: <seconds>` (time until window resets)
7. [API] Wait for `retryAfter` seconds + 1
8. [API] POST `/api/threads/:threadId/messages` with `{ content: "After reset" }`
9. [Verify] Response status 200 (rate limit window reset)

**Expected Results:**
✅ First 30 messages succeed  
✅ 31st message returns 429 with MESSAGE_RATE_LIMIT  
✅ Error includes retryAfter time  
✅ After window expires, messages resume  

**Status:** ⏸️ Pending Playwright E2E

---

## Scenario 4: Profanity Filter Rejection

**User Story:** As a system, I must reject messages containing profanity

**Steps:**
1. [Auth] Sign in as `user1@test.com`
2. [API] POST `/api/threads` to create DM thread with user2
3. [API] POST `/api/threads/:threadId/messages` with `{ content: "This is a clean message" }`
4. [Verify] Response status 200
5. [API] POST `/api/threads/:threadId/messages` with `{ content: "This message contains fuck word" }`
6. [Verify] Response status 400
7. [Verify] Error response contains:
   - `code: "MESSAGE_PROFANITY"`
   - `error: "Message contains inappropriate content"`
8. [API] POST `/api/threads/:threadId/messages` with `{ content: "Another bad shit message" }`
9. [Verify] Response status 400, code="MESSAGE_PROFANITY"
10. [API] GET `/api/threads/:threadId/messages`
11. [Verify] Only clean message appears (profane messages not saved)

**Expected Results:**
✅ Clean messages accepted  
✅ Profane messages rejected with 400  
✅ Error code MESSAGE_PROFANITY returned  
✅ Rejected messages not saved to database  

**Status:** ⏸️ Pending Playwright E2E

---

## Scenario 5: AI Toxicity Detection (Optional)

**User Story:** As a system, I should detect toxic content using AI when OpenAI is available

**Preconditions:** `OPENAI_API_KEY` must be configured

**Steps:**
1. [Auth] Sign in as `user1@test.com`
2. [API] POST `/api/threads` to create DM thread with user2
3. [API] POST `/api/threads/:threadId/messages` with `{ content: "You are wonderful!" }`
4. [Verify] Response status 200 (positive sentiment OK)
5. [API] POST `/api/threads/:threadId/messages` with `{ content: "I hate you and wish you would die" }`
6. [Verify] Response status 400
7. [Verify] Error response contains:
   - `code: "MESSAGE_TOXIC"`
   - `error: "Message flagged as potentially toxic: hate, harassment"`
8. [API] POST `/api/threads/:threadId/messages` with `{ content: "Go kill yourself" }`
9. [Verify] Response status 400, code="MESSAGE_TOXIC"
10. [API] GET `/api/threads/:threadId/messages`
11. [Verify] Only positive message appears

**Graceful Degradation Test:**
1. [Config] Remove `OPENAI_API_KEY` environment variable
2. [Restart] Server to apply config change
3. [API] POST `/api/threads/:threadId/messages` with toxic content
4. [Verify] Response status 200 (AI toxicity detection disabled)
5. [Verify] Only profanity filter active

**Expected Results:**
✅ Toxic content rejected when OpenAI configured  
✅ Error code MESSAGE_TOXIC with detected categories  
✅ When OpenAI unavailable, only profanity filtering active  
✅ Server continues functioning without AI  

**Status:** ⏸️ Pending Playwright E2E

---

## Scenario 6: Message Reporting Workflow

**User Story:** As a user, I want to report inappropriate messages for staff review

**Steps:**
1. [Auth] Sign in as `user1@test.com`
2. [API] POST `/api/threads` to create DM thread with user2
3. [API] POST `/api/threads/:threadId/messages` with `{ content: "Inappropriate but passes filters" }`
4. [Verify] Response status 200 (message sent)
5. [Note] Save `messageId` from response
6. [Auth] Sign in as `user2@test.com`
7. [API] GET `/api/threads/:threadId/messages`
8. [Verify] Message visible
9. [API] POST `/api/messages/:messageId/report` with `{ reason: "This is spam and misleading content that violates community standards" }`
10. [Verify] Response status 200
11. [Verify] Response contains report ID and status=PENDING
12. [API] POST `/api/messages/:messageId/report` with `{ reason: "Duplicate report" }`
13. [Verify] Response status 400 (duplicate report prevented)
14. [Auth] Sign in as `user1@test.com`
15. [API] GET `/api/threads/:threadId/messages`
16. [Verify] Message still visible (reporting doesn't hide message)
17. [Verify] Message does NOT have `flaggedAt` (not yet reviewed)

**Expected Results:**
✅ Users can report messages with reason  
✅ Duplicate reports prevented (one per user per message)  
✅ Reported messages remain visible until staff review  
✅ Report created with PENDING status  

**Status:** ⏸️ Pending Playwright E2E

---

## Scenario 7: STAFF Moderation Review Actions

**User Story:** As a STAFF member, I want to review reports and take action

**Preconditions:** Scenario 6 completed (report exists)

**Steps:**
1. [Auth] Sign in as `user1@test.com` (FREE tier)
2. [API] GET `/api/moderation/queue`
3. [Verify] Response status 403 (non-STAFF cannot access)
4. [Auth] Sign in as `staff@test.com` (STAFF tier)
5. [API] GET `/api/moderation/queue`
6. [Verify] Response status 200
7. [Verify] Queue contains report from Scenario 6
8. [Verify] Report includes:
   - Reporter info (user2)
   - Message content
   - Sender info (user1)
   - Reason text
   - Status=PENDING
9. [Note] Save `reportId` from response

**Test Action: FLAG**
10. [API] POST `/api/moderation/review` with `{ reportId, action: "FLAG" }`
11. [Verify] Response status 200
12. [API] GET `/api/threads/:threadId/messages` (as any user)
13. [Verify] Message now has `flaggedAt` timestamp
14. [API] GET `/api/moderation/queue`
15. [Verify] Report no longer in queue (status=UPHELD)

**Test Action: CLEAR** (using new report)
16. [Setup] Create new report for testing
17. [API] POST `/api/moderation/review` with `{ reportId, action: "CLEAR" }`
18. [Verify] Report status=CLEARED, message NOT flagged

**Test Action: DISMISS** (using new report)
19. [Setup] Create new report for testing
20. [API] POST `/api/moderation/review` with `{ reportId, action: "DISMISS" }`
21. [Verify] Report status=DISMISSED, message NOT flagged

**Expected Results:**
✅ Non-STAFF users cannot access moderation queue (403)  
✅ STAFF can view queue with full context  
✅ FLAG action sets message.flaggedAt  
✅ CLEAR action marks report cleared without flagging  
✅ DISMISS action dismisses spurious reports  
✅ Reviewed reports removed from queue  

**Status:** ⏸️ Pending Playwright E2E

---

## Scenario 8: Email Notifications Fired

**User Story:** As a user, I want email notifications when I receive messages

**Preconditions:** `RESEND_API_KEY` configured

**Steps:**
1. [Auth] Sign in as `user1@test.com`
2. [API] POST `/api/threads` to create DM thread with user2
3. [API] POST `/api/threads/:threadId/messages` with `{ content: "Notification test message" }`
4. [Verify] Response status 200
5. [Logs] Check server logs for Resend API call
6. [Verify] Email sent to `user2@test.com` (recipient)
7. [Verify] Email NOT sent to `user1@test.com` (sender excluded)
8. [Email] Verify email contains:
   - Sender name: user1
   - Message preview: "Notification test message"
   - Link to thread: `/messages/:threadId`
   - Template: `message_received`

**Club Thread Notification:**
9. [Auth] Sign in as `user1@test.com`
10. [API] Create club thread with 3 members
11. [API] POST message to club thread
12. [Verify] Emails sent to 2 other members (sender excluded)

**Graceful Degradation Test:**
13. [Config] Remove `RESEND_API_KEY`
14. [Restart] Server
15. [API] POST message
16. [Verify] Message sent successfully (notification failure doesn't block)
17. [Logs] Verify warning logged about missing Resend key

**Expected Results:**
✅ Email sent to recipients (not sender)  
✅ Email contains correct sender, preview, link  
✅ Club threads notify all members except sender  
✅ Missing Resend key logs warning but doesn't fail  

**Status:** ⏸️ Pending Playwright E2E

---

## Summary of Test Coverage

| Scenario | Feature | Auth | RBAC | Rate Limit | Moderation | Notifications | AI |
|----------|---------|------|------|------------|------------|---------------|-----|
| 1 | DM Messaging | ✅ | ✅ | - | - | - | - |
| 2 | Club RBAC | ✅ | ✅ | - | - | - | - |
| 3 | Rate Limiting | ✅ | - | ✅ | - | - | - |
| 4 | Profanity Filter | ✅ | - | - | ✅ | - | - |
| 5 | AI Toxicity | ✅ | - | - | ✅ | - | ✅ |
| 6 | Reporting | ✅ | ✅ | - | ✅ | - | - |
| 7 | STAFF Review | ✅ | ✅ | - | ✅ | - | - |
| 8 | Notifications | ✅ | - | - | - | ✅ | - |

**Total Scenarios:** 8  
**Features Covered:** DM, Clubs, RBAC, Rate Limiting, Profanity, AI Toxicity, Reporting, Moderation, Notifications  
**Status:** Ready for Playwright E2E Testing

---

## Next Steps

1. ✅ Backend implementation complete
2. ✅ Frontend UI pages created
3. ✅ Documentation written (ROUTE_MAP, TEST_LOG)
4. ⏸️ **PAUSED** - Awaiting user confirmation before Playwright testing
5. ⏳ Run Playwright E2E tests for all 8 scenarios
6. ⏳ Fix any issues discovered
7. ⏳ Final architect review
8. ⏳ Update replit.md with Sprint-3 completion
