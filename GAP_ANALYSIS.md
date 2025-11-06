# Book Pitch — Gap Analysis Report
**Generated:** November 6, 2025

## Executive Summary

The current codebase has **60-70% of the Book Pitch vision implemented**, with strong foundations in place for pitches, voting, points/badges, and analytics. The main gaps are in monetization features (club sponsorships, author promotion credits) and the AuthorSwap network concept.

---

## ✅ What's Complete & Working

### 1. **Core User Roles** ✅
- ✅ READER, AUTHOR, CLUB_ADMIN, STAFF roles fully implemented
- ✅ User authentication via Supabase Auth
- ✅ Email verification & password reset flows
- ✅ Production-ready security (helmet, CSRF, rate limiting)

### 2. **Book Clubs** ✅
- ✅ Create/join clubs with role-based permissions (OWNER, ADMIN, MEMBER)
- ✅ Club pages with description, genres, frequency, member limits
- ✅ Club rooms with message feeds, polls, and info tabs
- ✅ Membership management (approve, promote, remove, ban)
- ✅ Club discovery with advanced search filters (genres, frequency, points)

### 3. **Book Pitches** ✅
- ✅ Authors can create pitches with title, synopsis, genre, cover
- ✅ Pitches can target specific clubs
- ✅ Pitch statuses: SUBMITTED, ACCEPTED, REJECTED, ARCHIVED
- ✅ Pitch nomination system (club owners/admins nominate pitches for polls)
- ✅ Pitch browsing with status filters

### 4. **Voting & Polls** ✅
- ✅ Club owners create polls from nominated pitches
- ✅ Members vote and earn points (+3 per vote, capped at 10/day)
- ✅ Poll types: PITCH or BOOK
- ✅ Poll statuses: DRAFT, OPEN, CLOSED, ARCHIVED
- ✅ Poll results tracked

### 5. **Points & Badges System** ✅ (EXCELLENT)
- ✅ Comprehensive point values:
  - Account created: +10
  - Onboarding completed: +15
  - Join club: +5
  - Vote in poll: +3 (max 10/day)
  - Post message: +1 (max 10/day)
  - Create pitch: +10
  - Pitch selected: +100
  - Complete swap: +25
  - Referral activated: +50 (max 250/day)
- ✅ 10 badges across reader, host, and author categories
- ✅ Auto-award logic for all badges
- ✅ Profile displays points, reputation, badges, activity ledger

### 6. **Author Analytics** ✅ (EXCELLENT)
- ✅ Dashboard showing:
  - Total pitches submitted
  - Acceptance rate
  - Total impressions (views)
  - Poll appearances
  - Votes received
  - Points earned from pitches
- ✅ Individual pitch analytics with poll history

### 7. **Book Swaps** ⚠️ (Different from Vision)
- ✅ Peer-to-peer book swap requests (REQUESTED → ACCEPTED → DELIVERED → VERIFIED)
- ✅ Tier-based swap limits (FREE: 3, PRO_AUTHOR: 10, PUBLISHER: 999)
- ✅ Deliverable tracking URLs
- ✅ Auto-creates verified reviews on VERIFIED status
- ⚠️ **Gap:** Current system is general peer-to-peer swaps, NOT the "AuthorSwap network" described in vision (author-to-author trading with verified reviews)

### 8. **Subscription Tiers** ✅ (Pricing Mismatch)
- ✅ Stripe integration with auto-created products
- ✅ Three tiers:
  - **Current:** Pro Author ($15/mo), Pro Club ($25/mo), Publisher ($99/mo)
  - **Vision:** Basic, Pro ($9.99/mo), Premium ($19.99/mo)
- ⚠️ **Gap:** Pricing and tier names don't match vision document

### 9. **Referral System** ✅
- ✅ Unique referral codes per user
- ✅ Track referrer/referee relationships
- ✅ Points awarded on activation

### 10. **Real-Time Features** ✅
- ✅ Notifications system (swap, poll, referral, membership)
- ✅ Notification bell with unread count

### 11. **Discovery Features** ✅
- ✅ Full-text search across books, clubs, pitches
- ✅ Trending items endpoint
- ✅ AI-powered book/club matching (if OpenAI configured)

---

## ❌ What's Missing (High Priority)

### 1. **Club Sponsorships** ❌ (CRITICAL for Revenue)
**Vision:** Authors pay to feature their pitches to selected clubs (e.g., "Show to all Fantasy clubs with 25+ members")

**Current State:** Does NOT exist

**Impact:** This is a primary monetization feature mentioned in the vision

**Implementation Required:**
- Payment system for sponsored pitch placements
- Targeting filters (genre, member count, reading frequency)
- Sponsored badge/indicator on pitches
- Analytics for sponsored pitch performance

---

### 2. **AuthorSwap Network** ❌ (Vision-Specific Feature)
**Vision:** A community where authors trade books and provide verified reviews to each other

**Current State:** General peer-to-peer swap system exists, but NOT author-specific network

**Gap:**
- No author-to-author matching/discovery
- No verified review system specifically for authors
- No AuthorSwap-specific badges or reputation
- No subscription tier control over AuthorSwap access

**Implementation Required:**
- Author-only swap network interface
- Verified review requirements for swaps
- AuthorSwap analytics (swap completion rate, review quality)
- Integration with author subscription tiers

---

### 3. **Author Promotion Credits** ❌
**Vision:** Authors can "buy credits to reach more clubs" (e.g., "Show my pitch to 50 mystery clubs this week")

**Current State:** Does NOT exist

**Implementation Required:**
- Credit purchase system (one-time payments, not subscriptions)
- Credit balance tracking per user
- Spend credits to boost pitch visibility
- Credit transaction history

---

### 4. **Points Economy Redemption** ❌
**Vision:** "Paid rewards for redeeming points"

**Current State:** Users earn points, but cannot redeem them for anything

**Gap:** No marketplace or redemption system

**Implementation Required:**
- Rewards catalog (discounts, perks, giveaway entries)
- Points redemption API
- Transaction history for redemptions

---

### 5. **Subscription Feature Matrix** ⚠️ (Incomplete)
**Vision:** Tiered plans control "number of active book pitches, visibility boost, access to AuthorSwap network, advanced analytics"

**Current State:** Tiers exist but feature gating is minimal

**Gap:**
- No enforcement of pitch limits by tier
- No visibility boost mechanism
- No AuthorSwap network access control
- Analytics are available to all authors (not gated by tier)

**Implementation Required:**
- Pitch limit enforcement (Basic: 1, Pro: 5, Premium: unlimited)
- Visibility boost algorithm (premium pitches shown first)
- Tier-based feature flags

---

### 6. **Mobile-Specific Features** ❌
**Vision:** "Mobile app with chat, push notifications, and gamified daily activity"

**Current State:** Web-only React app

**Note:** This is a future roadmap item, not immediate

---

## ⚠️ What's Partially Built

### 1. **Subscription Pricing** ⚠️
- **Built:** Stripe products with $15/$25/$99 pricing
- **Vision:** $9.99 (Pro), $19.99 (Premium) pricing
- **Action:** Update Stripe prices or align vision doc with current prices

### 2. **Book Pitch Details** ⚠️
- **Built:** Title, synopsis, genre, cover, target club
- **Vision:** Also mentions "formats available, video pitch/trailer, download links, pre-order buttons"
- **Gap:** No video pitch support, no format options (ebook/paperback/audiobook), no download/purchase links

---

## 📊 Implementation Priority Recommendations

### **Phase 1: Monetization Essentials** (Highest ROI)
1. **Club Sponsorships** - Primary revenue driver
2. **Author Promotion Credits** - One-time payment revenue stream
3. **Subscription Feature Gating** - Enforce pitch limits, visibility boosts

### **Phase 2: AuthorSwap Network** (Community Building)
4. **Author-to-Author Swap System** - Differentiate from general swaps
5. **Verified Review Requirements** - Quality control for AuthorSwap

### **Phase 3: Engagement & Retention**
6. **Points Redemption System** - Give points real value
7. **Video Pitch Support** - Richer author pitches
8. **Book Format Options** - More detailed pitch metadata

---

## 💡 Architecture Recommendations

### Current Strengths to Leverage:
- ✅ Prisma ORM with well-designed schema
- ✅ Fastify backend with strong auth/security
- ✅ Stripe integration ready for expansion
- ✅ Points/badges system is excellent foundation
- ✅ Analytics infrastructure in place

### Suggested Next Steps:
1. **Update `replit.md`** to reflect Book Pitch vision (not generic book club app)
2. **Create sponsor pitch workflow:**
   - Add `SponsoredPitch` model (pitchId, clubId, budget, impressions, clicks)
   - API endpoint: `POST /api/pitches/:id/sponsor` with targeting filters
   - Payment via Stripe checkout
3. **Implement AuthorSwap network:**
   - Add `authorSwapEnabled` flag to Pitch model
   - Filter swaps by author role
   - Require verified review on completion
4. **Add promotion credits:**
   - Add `creditBalance` to User model
   - Create `CreditTransaction` model
   - API: `POST /api/credits/purchase`, `POST /api/credits/spend`

---

## 📈 Alignment Score by Category

| Category | Alignment | Notes |
|----------|-----------|-------|
| User Roles | 100% | Perfect match |
| Clubs | 95% | Excellent, minor features missing |
| Pitches | 85% | Core complete, missing video/formats |
| Voting/Polls | 100% | Perfect match |
| Points/Badges | 100% | Exceeds vision expectations |
| Analytics | 95% | Excellent author analytics |
| Swaps | 60% | Works but not "AuthorSwap network" |
| Subscriptions | 70% | Exists but pricing/features misaligned |
| **Monetization** | **30%** | Major gap - no sponsorships or credits |
| Discovery | 100% | Excellent search/AI features |

**Overall Alignment: 65-70%**

---

## Next Steps

**Immediate Actions:**
1. Update `replit.md` with Book Pitch vision
2. Decide on pricing strategy (current vs. vision)
3. Prioritize feature roadmap (recommend Phase 1 focus)

**Questions for Product Owner:**
1. Should we align current $15/$25/$99 pricing with vision's $9.99/$19.99?
2. Is club sponsorship the #1 priority for revenue?
3. Should AuthorSwap be author-only or keep general peer-to-peer swaps?
4. What should users be able to redeem points for?
