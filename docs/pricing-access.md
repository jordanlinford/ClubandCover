# Club & Cover - Pricing & Access Control

Last Updated: November 2025

## Core Principle
**Readers are always free.** Only authors and club hosts need paid tiers for increased limits.

## Tier Matrix

### FREE Tier (Default)
**Available to:** Everyone  
**Cost:** Free forever

**Reader Capabilities (Unlimited):**
- ✅ Join public clubs
- ✅ Request to join private clubs
- ✅ Vote in club polls
- ✅ Post messages in clubs
- ✅ View all pitches and author profiles
- ✅ Earn points through participation
- ✅ Redeem rewards (if sufficient points)
- ✅ Follow authors
- ✅ Participate in book swaps

**Author Capabilities (Limited):**
- ✅ Create up to 3 active pitches
- ✅ Request up to 3 pending swaps
- ✅ Make 10 AI calls per day

**Club Host Capabilities (Unlimited):**
- ✅ Create clubs
- ✅ Manage members
- ✅ Create polls
- ✅ Generate invite codes

---

### PRO_AUTHOR Tier
**Cost:** $15/month  
**Target:** Active authors pitching books

**Everything in FREE, plus:**
- ✅ Create up to 10 active pitches (vs. 3)
- ✅ Request up to 10 pending swaps (vs. 3)
- ✅ Make 50 AI calls per day (vs. 10)
- ✅ Pitch visibility boost in discovery

---

### PRO_CLUB Tier
**Cost:** $25/month  
**Target:** Power club hosts

**Everything in FREE, plus:**
- ✅ Create up to 10 pending swaps (vs. 3)
- ✅ Make 50 AI calls per day (vs. 10)

**Note:** Currently does NOT gate any club management features. All club creation, polls, invites, and member management work on FREE tier.

---

### PUBLISHER Tier
**Cost:** $99/month  
**Target:** Publishers with large catalogs

**Everything in FREE, plus:**
- ✅ Essentially unlimited pitches (999)
- ✅ Essentially unlimited swaps (999)
- ✅ Essentially unlimited AI calls (999/day)
- ✅ Pitch visibility boost in discovery

---

## Implementation Details

### Tier Enforcement Locations

| Feature | File | Lines | Logic |
|---------|------|-------|-------|
| Pitch Limits | `apps/api/src/routes/pitches.ts` | 166-184 | Checks active pitch count against tier limit |
| Swap Limits | `apps/api/src/routes/swaps.ts` | 136-153 | Checks pending swap count against tier limit |
| AI Rate Limit | `apps/api/src/middleware/aiRateLimit.ts` | 4-75 | Daily reset, tier-based limits |
| Pitch Sorting | `apps/api/src/routes/pitches.ts` | 423-430 | `ORDER BY isBoosted DESC, authorTier DESC, createdAt DESC` |

### Stripe Product IDs
- `prod_pro_author` → PRO_AUTHOR tier
- `prod_pro_club` → PRO_CLUB tier
- `prod_publisher` → PUBLISHER tier

### Webhook Handling
When subscription status changes:
- **Active subscription** → User upgraded to tier
- **Canceled/Unpaid** → User downgraded to FREE
- **Deleted** → User downgraded to FREE

---

## Test Coverage

### Required Tests
1. **Free Reader Actions** - Verify all reader capabilities work on FREE tier
2. **Author Tier Limits** - Verify pitch/swap/AI limits enforce correctly per tier
3. **Points System** - Verify points earning/redemption is not tier-gated
4. **Tier Upgrades** - Verify limits increase immediately after subscription

### Guard Rails
- No tier checks should ever appear in: club joining, poll voting, message posting, pitch viewing
- All tier checks should only appear in: pitch creation, swap requests, AI endpoints
- Future features affecting readers must explicitly verify FREE tier access

---

## Future Considerations

### Potential PRO_CLUB Features
If PRO_CLUB should unlock premium club features (currently it doesn't), consider:
- Advanced analytics for club hosts
- Customizable club themes
- Priority club discovery placement
- Club sponsorship opportunities

### Credits System
Separate from tiers, users can purchase credits for:
- Boosting pitch visibility
- Featured author placement
- Sponsored club placement

---

## Audit Trail
- **November 2025:** Initial pricing audit - confirmed reader flows are free
