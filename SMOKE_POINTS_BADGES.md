# Points & Badges v1 (MVP) - Smoke Test Scenarios

This document outlines manual smoke test scenarios for the Points & Badges gamification system.

## Test Prerequisites

1. **Environment**: Development environment with database access
2. **User**: Authenticated user account (use test seed data if available)
3. **Browser**: Modern browser with console access

## Test Data Setup (Optional)

If using the test seed endpoint:

```bash
curl -X POST http://localhost:5000/api/test/seed-club-fixture \
  -H "x-seed-token: YOUR_TEST_SEED_TOKEN"
```

This creates:
- Test user: `clubtest@bookpitch.dev` (password: `Test123!`)
- Pre-seeded points: 57 total points
- Pre-seeded badges: FIRST_VOTE, AUTHOR_LAUNCH, HOST_STARTER

## Smoke Test Scenarios

### 1. View Points & Badges on Profile

**Steps:**
1. Navigate to `/profile`
2. Verify points display shows total points
3. Verify badges section displays earned badges with:
   - Badge icon
   - Badge name
   - Badge description
   - Earned date

**Expected:**
- Points section shows current total
- Recent activity table shows ledger entries
- Badges display in grid layout
- Empty state message if no badges earned

**Pass Criteria:** ✅ All components render without errors

---

### 2. Earn ACCOUNT_CREATED Points (Auto-Award)

**Steps:**
1. Create a new user account via sign-up
2. Navigate to `/profile`
3. Check points total

**Expected:**
- User receives +10 points for ACCOUNT_CREATED
- Ledger shows ACCOUNT_CREATED entry

**Pass Criteria:** ✅ Points awarded automatically on account creation

---

### 3. Earn ONBOARDING_COMPLETED Points

**Steps:**
1. Complete the onboarding wizard at `/onboarding`
2. Navigate to `/profile`
3. Check points total and ledger

**Expected:**
- User receives +15 points for ONBOARDING_COMPLETED
- Ledger shows ONBOARDING_COMPLETED entry

**Pass Criteria:** ✅ Points awarded after onboarding completion

---

### 4. Earn JOIN_CLUB Points

**Steps:**
1. Join a book club from `/clubs`
2. Navigate to `/profile`
3. Check points total and ledger

**Expected:**
- User receives +5 points for JOIN_CLUB
- Ledger shows JOIN_CLUB entry

**Pass Criteria:** ✅ Points awarded when joining a club

---

### 5. Earn FIRST_VOTE Badge & Points

**Steps:**
1. Navigate to an active poll in a club
2. Cast your first vote
3. Navigate to `/profile`
4. Check badges section and points

**Expected:**
- User receives +3 points for VOTE_PARTICIPATION
- User receives FIRST_VOTE badge (first vote only)
- Badge appears in profile with appropriate icon

**Pass Criteria:** ✅ Badge and points awarded on first vote

---

### 6. Earn BOOKWORM Badge (10+ Votes)

**Steps:**
1. Cast 10 votes across different polls
2. Navigate to `/profile`
3. Check badges section

**Expected:**
- After 10th vote, BOOKWORM badge is awarded
- Badge appears in profile

**Pass Criteria:** ✅ Badge awarded after reaching 10 votes

---

### 7. Daily Cap for VOTE_PARTICIPATION (10 pts/day)

**Steps:**
1. Cast 4 votes in a single day (4 × 3 = 12 points attempted)
2. Navigate to `/profile`
3. Check points ledger

**Expected:**
- First 3 votes award 3 points each (9 points)
- 4th vote only awards 1 point (capped at 10 pts/day)
- Total VOTE_PARTICIPATION points = 10 for the day

**Pass Criteria:** ✅ Daily cap enforced at 10 points

---

### 8. Earn AUTHOR_LAUNCH Badge & PITCH_CREATED Points

**Steps:**
1. Create your first pitch at `/pitches/new`
2. Navigate to `/profile`
3. Check badges and points

**Expected:**
- User receives +10 points for PITCH_CREATED
- User receives AUTHOR_LAUNCH badge (first pitch only)
- Badge appears in profile

**Pass Criteria:** ✅ Badge and points awarded on first pitch

---

### 9. Earn HOST_STARTER Badge

**Steps:**
1. Create your first club at `/clubs/new`
2. Navigate to `/profile`
3. Check badges section

**Expected:**
- HOST_STARTER badge is awarded
- Badge appears in profile

**Pass Criteria:** ✅ Badge awarded when creating first club

---

### 10. Earn MESSAGE_POSTED Points with Daily Cap

**Steps:**
1. Post 15 messages (≥10 chars each) in a club room
2. Navigate to `/profile`
3. Check points ledger

**Expected:**
- Each eligible message (≥10 chars) awards 1 point
- Maximum 10 points awarded per day
- Ledger shows MESSAGE_POSTED entries capped at 10

**Pass Criteria:** ✅ Points awarded with 10 pts/day cap

---

### 11. API Endpoints Test

**Test `/api/points/me`:**
```bash
curl http://localhost:5000/api/points/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "points": 57,
    "ledger": [
      {
        "id": "...",
        "userId": "...",
        "amount": 10,
        "eventType": "PITCH_CREATED",
        "refType": "PITCH",
        "refId": "...",
        "createdAt": "2025-11-06T..."
      }
    ]
  }
}
```

**Test `/api/badges/me`:**
```bash
curl http://localhost:5000/api/badges/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "badges": [
      {
        "id": "...",
        "userId": "...",
        "badgeId": "FIRST_VOTE",
        "earnedAt": "2025-11-01T...",
        "badge": {
          "id": "FIRST_VOTE",
          "name": "First Vote",
          "description": "Cast your first vote in a poll",
          "category": "READER",
          "icon": "Target"
        }
      }
    ]
  }
}
```

**Pass Criteria:** ✅ Both endpoints return correct data structure

---

## Edge Cases to Verify

### 12. Empty State for Badges

**Steps:**
1. Create a fresh user with no activity
2. Navigate to `/profile`
3. Check badges section

**Expected:**
- Empty state message displayed
- Encouragement to participate

**Pass Criteria:** ✅ Graceful empty state

---

### 13. Badge Uniqueness (No Duplicates)

**Steps:**
1. Trigger the same badge condition twice (e.g., vote twice)
2. Navigate to `/profile`
3. Check badges section

**Expected:**
- Only ONE instance of each badge
- No duplicate badges in the list

**Pass Criteria:** ✅ Badges only awarded once

---

### 14. Point Ledger History

**Steps:**
1. Perform multiple activities to earn points
2. Navigate to `/profile`
3. Check "Recent Activity" table

**Expected:**
- All point transactions listed
- Sorted by most recent first
- Shows event type, date, and amount

**Pass Criteria:** ✅ Complete audit trail of points

---

## Badge Catalog Reference

| Badge ID | Name | Description | Category | Trigger |
|----------|------|-------------|----------|---------|
| FIRST_VOTE | First Vote | Cast your first vote in a poll | READER | 1st vote |
| BOOKWORM | Bookworm | Voted in 10 or more polls | READER | 10 votes |
| SOCIABLE | Sociable | Posted 50+ messages in clubs | READER | 50 messages |
| LOYAL_MEMBER | Loyal Member | Active member for 6+ months | READER | 6 months membership |
| HOST_STARTER | Host Starter | Created your first club | HOST | Create 1 club |
| COMMUNITY_ACTIVE | Community Active | Hosted 20+ polls | HOST | 20 polls |
| DECISIVE | Decisive | Concluded 10+ polls with winners | HOST | 10 poll closures |
| AUTHOR_LAUNCH | Author Launch | Submitted your first pitch | AUTHOR | 1 pitch |
| FAN_FAVORITE | Fan Favorite | Won 5+ polls | AUTHOR | 5 poll wins |
| SWAP_MASTER | Swap Master | Completed 10+ book swaps | AUTHOR | 10 swaps |

## Point Values Reference

| Event Type | Points | Daily Cap |
|------------|--------|-----------|
| ACCOUNT_CREATED | 10 | N/A (one-time) |
| ONBOARDING_COMPLETED | 15 | N/A (one-time) |
| JOIN_CLUB | 5 | N/A |
| VOTE_PARTICIPATION | 3 | 10 pts/day |
| MESSAGE_POSTED | 1 | 10 pts/day |
| PITCH_CREATED | 10 | N/A |
| SWAP_COMPLETED | 20 | N/A |

## Troubleshooting

**Points not appearing?**
- Check browser console for API errors
- Verify authentication token is valid
- Check database for PointLedger entries

**Badges not displaying?**
- Verify badge icons are imported in BadgesDisplay.tsx
- Check UserBadge table for badge records
- Ensure badge.badge relation is populated

**Daily cap not working?**
- Check DailyPointCounter table for today's entries
- Verify UTC date boundary logic
- Review server logs for cap enforcement

## Success Criteria

All smoke tests must pass:
- ✅ Points awarded at all touchpoints
- ✅ Badges display correctly on profile
- ✅ Daily caps enforced properly
- ✅ API endpoints return correct data
- ✅ No duplicate badges awarded
- ✅ Empty states handled gracefully
