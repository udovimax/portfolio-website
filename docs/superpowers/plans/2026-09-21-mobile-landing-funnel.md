# Mobile Landing Funnel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved phone-only horizontal landing funnel and guided enquiry flow without changing desktop portfolio behavior.

**Architecture:** Keep `App.tsx` as the composition root, add a mobile-only funnel component, reuse/extend `Carousel` for bounded horizontal steps, and extract contact-flow validation/submission state so the mobile flow and desktop drawer share one backend contract.

**Tech Stack:** React 19, TypeScript, Vite, Framer Motion, existing Carousel/Lenis/Howler stack, Node test runner, CSS media queries.

**Spec:** `docs/superpowers/specs/2026-09-21-mobile-landing-funnel-design.md`

## Global Constraints

- The funnel applies only at `max-width: 760px`.
- Desktop and tablet home rendering remain unchanged.
- Existing hash routes and legacy `#contact` behavior remain valid.
- Reuse the existing Carousel horizontal interaction primitive.
- Preserve accessibility, reduced motion, focus return, safe-area spacing, and no page-level horizontal overflow.
- Do not add dependencies, analytics PII, or a new backend.

## Review Focus

- A short phone viewport must keep the landing funnel readable without document scrolling; test at 375×667.
- Swipe, arrow buttons, keyboard arrows, and progress state must remain synchronized; test forward/back bounds.
- Inactive slides and hidden responsive variants must not remain keyboard-focusable; test focus order at 390px.
- A booking step must retain token/public-location/type/estimate fields and reject stale or incomplete selections; test with a fixture response.
- Switching across the 760px breakpoint while a flow is open must not leave two modal surfaces active; test with a resize transition.

### Task 1: Mobile funnel and contact-flow contracts

**Files:**
- Create: `app/src/utils/mobileFunnel.ts`
- Create: `app/src/utils/mobileFunnel.test.ts`
- Create: `app/src/utils/contactFlow.ts`
- Create: `app/src/utils/contactFlow.test.ts`

**Interfaces:**
- Produces `MOBILE_PHONE_MEDIA_QUERY`, `MOBILE_FUNNEL_STEPS`, `MOBILE_ENQUIRY_STEPS`, `clampStepIndex(index, count)`, `mobileRouteAction(route)`, and `validateContactFlowStep(step, values)`.
- `mobileRouteAction('hear')` returns `{ kind: 'hash', value: '#music' }`; `mobileRouteAction('explore')` returns `{ kind: 'hash', value: '#about' }`; `mobileRouteAction('work')` returns `{ kind: 'contact', value: '' }`.
- `validateContactFlowStep` returns `null` when valid or a user-facing error string when the current step is incomplete.

- [x] **Step 1: Write failing contract tests**

```ts
test('maps mobile route choices to existing site actions', () => {
  assert.deepEqual(mobileRouteAction('work'), { kind: 'contact', value: '' })
  assert.deepEqual(mobileRouteAction('hear'), { kind: 'hash', value: '#music' })
  assert.deepEqual(mobileRouteAction('explore'), { kind: 'hash', value: '#about' })
})

test('clamps funnel step indexes to real bounds', () => {
  assert.equal(clampStepIndex(-1, 2), 0)
  assert.equal(clampStepIndex(1, 2), 1)
  assert.equal(clampStepIndex(8, 2), 1)
})

test('requires intent, message, identity, and valid email on their respective steps', () => {
  assert.match(validateContactFlowStep('intent', { interest: '' }), /choose/i)
  assert.match(validateContactFlowStep('details', { interest: 'General enquiry', message: '' }), /message/i)
  assert.match(validateContactFlowStep('identity', { name: '', email: 'max@example.com' }), /name/i)
  assert.match(validateContactFlowStep('identity', { name: 'A', email: 'bad' }), /email/i)
  assert.equal(validateContactFlowStep('review', { interest: 'General enquiry', message: 'Hello', name: 'A', email: 'max@example.com' }), null)
})
```

- [x] **Step 2: Run the focused tests and verify the expected missing-module failure**

Run: `npm --prefix app test -- src/utils/mobileFunnel.test.ts src/utils/contactFlow.test.ts`

Expected: FAIL because the new utilities do not exist yet.

- [x] **Step 3: Implement the minimal pure contracts**

Implement the exact exports above, keep contact validation independent of React and browser globals, and reuse the existing interest constants where possible.

- [x] **Step 4: Run focused and complete frontend tests**

Run: `npm --prefix app test -- src/utils/mobileFunnel.test.ts src/utils/contactFlow.test.ts && npm --prefix app test`

Expected: all focused tests and the complete suite pass.

- [x] **Step 5: Commit**

```bash
git add app/src/utils/mobileFunnel.ts app/src/utils/mobileFunnel.test.ts app/src/utils/contactFlow.ts app/src/utils/contactFlow.test.ts
git commit -m "test: define mobile funnel and contact flow contracts"
```

### Task 2: Reusable mobile stepper and landing funnel

**Files:**
- Modify: `app/src/components/Carousel.tsx`
- Create: `app/src/components/MobileLandingFunnel.tsx`
- Modify: `app/src/index.css`

**Interfaces:**
- `Carousel` gains optional full-screen presentation controls without changing existing call sites: `hideControls?: boolean`, `showProgress?: boolean`, and `onStepChange` remains compatible with `onActiveIndexChange`.
- `MobileLandingFunnel` accepts `onOpenContact`, `onNavigate`, `supportHref`, and `name/roles/intro` content, and exposes the two landing screens through a semantic carousel.

- [x] **Step 1: Add a failing structural/component contract**

Add a small pure assertion or DOM-facing test that the funnel exposes two named screens, three route actions, Contact, Support Max, and a progress label. Keep the test independent of a browser-only test library by testing the exported screen/action model from `mobileFunnel.ts`.

- [x] **Step 2: Run the test and verify it fails for the missing funnel model**

Run: `npm --prefix app test -- src/utils/mobileFunnel.test.ts`

Expected: FAIL on the missing screen/action export.

- [x] **Step 3: Implement the funnel and Carousel presentation hooks**

Use the existing Carousel track for horizontal scrolling, add bounded controls/progress without changing existing work carousels, render only concise mobile content, route Hear/Explore through the existing hash callbacks, and make inactive panels inert/non-focusable when not active.

- [x] **Step 4: Run tests and typecheck**

Run: `npm --prefix app test && npm --prefix app run typecheck`

Expected: all tests pass and TypeScript reports no errors.

- [x] **Step 5: Commit**

```bash
git add app/src/components/Carousel.tsx app/src/components/MobileLandingFunnel.tsx app/src/index.css app/src/utils/mobileFunnel.ts
git commit -m "feat: add phone landing funnel"
```

### Task 3: Shared guided contact flow

**Files:**
- Create: `app/src/components/MobileEnquiryFlow.tsx`
- Modify: `app/src/components/ContactDrawer.tsx`
- Create or modify: `app/src/hooks/useContactFlow.ts`

**Interfaces:**
- `MobileEnquiryFlow` receives the same endpoint/email/PayPal/availability props as the existing contact surface plus `isOpen`, `onClose`, and `initialInterest`.
- Shared controller state owns interest, contact fields, booking selection, availability state, validation, FormSubmit submission, Apps Script capture, success state, and reset.
- The existing desktop drawer remains a presentation mode over the shared controller; no form field names or backend payload keys change.

- [x] **Step 1: Extend failing validation tests for booking-specific details**

```ts
test('requires an opaque selectable booking before booking flow review', () => {
  assert.match(validateContactFlowStep('details', {
    interest: 'Booking / studio session',
    message: 'Session request',
    bookingDate: '2026-10-04',
    bookingTime: '10:00',
    bookingEndTime: '11:00',
    bookingToken: '',
  }), /available booking/i)
})
```

- [x] **Step 2: Run the test and verify the expected failure**

Run: `npm --prefix app test -- src/utils/contactFlow.test.ts`

Expected: FAIL because booking-specific validation is not implemented.

- [x] **Step 3: Extract shared controller behavior and implement the mobile steps**

Move duplicated validation/submission decisions into the shared controller, render one guided step at a time, preserve public booking privacy, provide Back/Next/Close controls, allow the details step to scroll internally when a calendar is taller than the viewport, and retain the existing focus trap/inert background contract.

- [x] **Step 4: Run focused and complete tests**

Run: `npm --prefix app test -- src/utils/contactFlow.test.ts && npm --prefix app test && npm --prefix app run typecheck`

Expected: all tests pass and the application typechecks.

- [x] **Step 5: Commit**

```bash
git add app/src/components/MobileEnquiryFlow.tsx app/src/components/ContactDrawer.tsx app/src/hooks/useContactFlow.ts app/src/utils/contactFlow.ts app/src/utils/contactFlow.test.ts
git commit -m "feat: add guided mobile enquiry flow"
```

### Task 4: Responsive integration and accessibility hardening

**Files:**
- Modify: `app/src/App.tsx`
- Modify: `app/src/components/FloatingNav.tsx`
- Modify: `app/src/index.css`

**Interfaces:**
- App selects one contact presentation at a time using a resize-aware phone-layout hook; a breakpoint transition closes the active surface rather than leaving both mounted.
- FloatingNav receives a responsive contact control id while preserving its existing menu, contact, swipe, Escape, and focus-return behavior.

- [x] **Step 1: Add failing integration assertions**

Add tests for the phone breakpoint query and contact surface selection: phone layout uses the mobile flow, larger layout uses the existing drawer, and `#contact` still opens one surface.

- [x] **Step 2: Run the tests and verify failure**

Run: `npm --prefix app test -- src/utils/mobileFunnel.test.ts src/utils/navigation.test.ts`

Expected: FAIL until the responsive selection helpers exist.

- [x] **Step 3: Integrate the mobile funnel into App and style the responsive shell**

Render the funnel only on the home page at `≤760px`, preserve existing desktop home markup above the breakpoint, hide the desktop scroll guide only for the mobile funnel, lock document scroll for the landing track, preserve safe-area spacing, and keep all existing routes reachable.

- [x] **Step 4: Run complete checks**

Run: `npm --prefix app test && npm --prefix app run typecheck && npm --prefix app run lint`

Expected: all tests pass, typecheck passes, and lint reports no errors.

- [x] **Step 5: Commit**

```bash
git add app/src/App.tsx app/src/components/FloatingNav.tsx app/src/index.css app/src/utils/mobileFunnel.ts app/src/utils/navigation.ts
git commit -m "feat: integrate responsive mobile portfolio funnel"
```

### Task 5: Browser QA, build, and deployment handoff

**Files:**
- Modify: `docs/superpowers/plans/2026-09-21-mobile-landing-funnel.md`
- Modify: `.superpowers/sdd/2026-09-21-mobile-landing-funnel/progress.md`

- [x] **Step 1: Start the production preview and exercise mobile funnel states**

Verify at 390×844 and 375×667: identity screen, swipe/button navigation, route actions, guided intent/details/identity/review flow, booking fixture, support link, keyboard fallback, Escape, reduced motion, and no document-level horizontal/vertical overflow.

- [x] **Step 2: Verify desktop regression and breakpoint transition**

Verify at 1440px and 761px that the existing home and drawer remain active; resize across 760px while the contact surface is open and confirm only one surface remains.

- [x] **Step 3: Run the final frontend verification**

Run: `npm --prefix app test && npm --prefix app run typecheck && npm --prefix app run lint && npm --prefix app run build && git diff --check`

Expected: all tests pass, lint/typecheck/build pass, and diff check is clean.

- [x] **Step 4: Update the ledger and commit documentation**

Record browser evidence, fixture privacy checks, warnings, and any rulings before committing the final documentation state.

- [x] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-09-21-mobile-landing-funnel-design.md docs/superpowers/plans/2026-09-21-mobile-landing-funnel.md .superpowers/sdd/2026-09-21-mobile-landing-funnel/progress.md
git commit -m "docs: record mobile funnel verification"
```

## Completion record — 2026-09-21

- The built preview was exercised at 390×844 and 375×667. The two-screen funnel, swipe/arrow navigation, route actions, guided enquiry steps, support rail, keyboard fallback, reduced-motion rendering, Escape close, and no-document-overflow states were checked.
- Desktop regression was checked at 1440×900 and 761×800. Resizing across 760px while either contact surface was open closed the previous surface before selecting the other, leaving one modal surface active.
- A browser-only availability fixture exposed an available 10:00–12:00 Camden studio / Studio session window plus a booked 13:00–14:00 window. The public booking view showed duration, rough location, booking type, and busy context; it did not show the fixture price or any personal booking identity.
- Final frontend tests passed: 22/22. Typecheck, lint, production build, and `git diff --check` passed. No real enquiry or email/Sheets submission was sent.
- This branch is ready for the requested deployment handoff; no remote push or GitHub Pages deployment was performed as part of the local verification pass.
