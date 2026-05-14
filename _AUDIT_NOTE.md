# Audit Recommendations & Status — AIWeddingPlanner

Source: /Users/erolakarsu/projects/_AUDIT/reports/batch_09.md

Verdict per audit: partial-build, 14 AI endpoints, 21 non-AI routes. "Coverage is broad."

## Original audit recommendations

Missing AI counterparts: few — coverage is broad.

Missing non-AI:
- Payment processing
- Venue contract templates
- Supplier inventory tracking
- Day-of staff management
- Vendor review/rating system

Custom feature ideas:
- Real-time guest preference learning
- Predictive budget overruns
- Vendor performance prediction
- Seating-conflict detection
- Destination wedding guides
- Live event-day coordination (IoT)
- Post-wedding thank-you generation
- Marriage counseling referrals

## Implemented in this pass

None. AI surface is already broad (14 endpoints). Remaining items are NEEDS-CREDS (Stripe etc.), NEEDS-PRODUCT-DECISION (counseling referrals), or substantive features (event-day IoT, vendor rating system).

## Backlog (priority order)

1. Predictive budget-overrun endpoint (`/api/ai/budget-risk`) — text-only AI over current budget vs spend; mechanical add-on.
2. Vendor performance prediction (`/api/ai/vendor-performance-prediction`) — text-only AI over vendor history; mechanical add-on.
3. Vendor rating system — substantial feature.
4. Payment processing — credentials decision (Stripe).
5. Day-of staff management — substantial product feature.

## Apply pass 4 (mechanical backlog)

- **Implemented:**
  - `POST /api/ai/budget-risk` — text-only AI over the user's real `wedding_profile` + `budget_items` (totals, paid, overruns vs estimate, days-until-wedding). Returns numeric metrics block in addition to AI text.
  - `POST /api/ai/vendor-performance-prediction` — text-only AI over the user's `vendors` (single vendor when `vendor_id` provided, else all of theirs). Predicts reliability/quality scores, risk signals, mitigations, and a due-diligence checklist.
  - Both call the existing `callOpenRouter` helper, persist via `persistResult`, and return a real 503 when `OPENROUTER_API_KEY` is missing (pre-flight check + error-path string match).
- **FE:** Added two entries (Budget Risk, Vendor Performance) to the existing `aiFeatures`/`formFields` switcher in `frontend/src/pages/AIAssistant.js`. JWT bearer flows through the existing `services/api` axios interceptor; 503 errors now render with a specific OPENROUTER_API_KEY hint.
- **Files modified:**
  - `backend/routes/ai.js`
  - `frontend/src/pages/AIAssistant.js`
- **Syntax check:** `node --check` PASS, `@babel/parser` JSX PASS.
- **Smoke:** backend on port 3801 with `OPENROUTER_API_KEY=""` → login as `demo@weddingplanner.com` → both `POST /api/ai/budget-risk` and `POST /api/ai/vendor-performance-prediction` returned `503 {"error":"AI service unavailable: OPENROUTER_API_KEY not configured."}`; without bearer → `401 Access denied`.
- **Backlog still deferred:** vendor rating system (substantive feature), payment processing (Stripe NEEDS-CREDS), day-of staff management (substantive), counseling referrals (PRODUCT-DECISION).

## Apply pass 3 (frontend)

- **Stack:** React (CRA) + Express backend.
- **Backend AI endpoints surveyed:** 14 endpoints in `backend/routes/ai.js` — `vendor-match, budget-optimize, timeline-suggest, seating-suggest, menu-suggest, invitation-wording, floral-suggest, music-suggest, general-advice, day-of-timeline, vow-writer, vendor-email-draft, wedding-stress-check`, plus `history`.
- **FE state:** `pages/AIAssistant.js` has a feature switcher hitting 9 endpoints; dedicated pages exist for `StressCheck`, `VendorEmail`, `DayOfTimeline`, `VowWriter`, `AIHistory`. All 14 endpoints have a UI surface.
- **Action:** LEFT-AS-IS — FE already wired (idempotence rule).
- **Files modified:** none.
