# Max Portfolio Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement and verify every actionable improvement from the live Apple-design audit across the GitHub Pages frontend and Max-owned Google Apps Script booking integration.

**Architecture:** Keep the existing React/Vite composition root and extract only focused utilities/components where behavior is shared. Reuse the proven contact-drawer focus/inert pattern for media dialogs, keep booking truth in Apps Script, and add frontend resilience around a stale/unavailable deployment. Use pure utility tests for data normalization and browser verification for interaction semantics.

**Tech Stack:** React 19, TypeScript, Vite, Framer Motion, Node test runner, Google Apps Script, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-18-max-portfolio-audit-remediation.md`

## Global Constraints

- Preserve the client-only React/Vite architecture and hash routes `home`, `music`, `projects`, `video`, and `about`.
- Preserve `integrations/google-sheets/Code.gs` as the source-of-truth boundary for availability and booking reservation.
- Never publish invented availability, price, location, payment terms, credentials, or private URLs.
- Keep FormSubmit as the email fallback; do not make analytics or the Sheet a prerequisite for a contact enquiry.
- Keep reduced-motion behavior and keyboard alternatives for every gesture or animated interaction.
- Preserve unrelated dirty `.playwright-cli/` and `output/` artifacts; do not commit them unless explicitly requested.

### Task 1: Lock the booking boundary and frontend availability contract

**Files:**
- Modify: `integrations/google-sheets/Code.gs`
- Modify: `integrations/google-sheets/README.md`
- Create: `app/src/utils/availability.ts`
- Create: `app/src/utils/availability.test.ts`
- Modify: `app/src/components/ContactDrawer.tsx`

**Interfaces:**
- `normaliseAvailabilityResponse(response: unknown): Record<string, BookingRange[]>` returns only validated future-facing ranges with `start`, `end`, `location`, `price`, and `paymentUrl` strings.
- `buildAvailabilityUrl(endpoint: string, from: string, days: number, callback: string): string` produces the JSONP request URL without leaking data into logs.
- `availabilityResponse_` continues to return JSONP for valid callbacks and JSON otherwise.

- [x] **Step 1: Write failing utility tests** for valid JSONP-shaped payloads, empty slot lists, malformed ranges, and URL query construction.
- [x] **Step 2: Run `npm test -- --test-name-pattern availability` and confirm the new tests fail because the utility does not exist.**
- [x] **Step 3: Implement the utility and use it from `ContactDrawer` so malformed/stale responses become an explicit unavailable state rather than a silent empty calendar.**
- [x] **Step 4: Add an Apps Script health note to the README and preserve the existing `doGet` availability route; do not change sheet truth or publish test rows.**
- [x] **Step 5: Run the focused tests and inspect the generated request URL for correct `action`, `from`, `days`, and callback parameters.**

### Task 2: Make project and video overlays accessible dialogs

**Files:**
- Create: `app/src/components/ModalDialog.tsx`
- Modify: `app/src/components/MediaModals.tsx`
- Modify: `app/src/App.tsx`
- Test: `app/src/utils/focusTrap.test.ts`

**Interfaces:**
- `ModalDialog` accepts `open`, `titleId`, `labelledBy`, `onClose`, `className`, and children; it owns Escape handling, backdrop close, focus containment, `inert` root state, and focus restoration.
- `VideoModal` and `ProjectModal` remain the existing public components and pass their title IDs into `ModalDialog`.

- [x] **Step 1: Extend the focus-loop tests with an active-element-outside case and verify the existing helper still passes.**
- [x] **Step 2: Implement `ModalDialog` by adapting the existing contact-drawer behavior, including a dedicated header row so the close button cannot overlap the title.**
- [x] **Step 3: Replace both media overlay wrappers with `ModalDialog`, add `aria-labelledby`, and keep backdrop click and explicit close buttons.**
- [ ] **Step 4: Run tests, typecheck, and a live browser check for Tab wrap, Shift+Tab wrap, Escape, backdrop close, and focus return.**

### Task 3: Surface configured actions and improve truthful feedback

**Files:**
- Modify: `app/src/App.tsx`
- Modify: `app/src/components/ContactDrawer.tsx`
- Modify: `app/src/components/MediaModals.tsx`
- Modify: `app/src/components/MediaArchive.tsx`
- Modify: `app/src/components/InstagramEmbed.tsx`
- Modify: `app/src/components/Player.tsx`
- Modify: `app/src/types/content.ts`

**Interfaces:**
- Project detail renders the existing `ProjectLink[]` values as labelled links.
- Track cards render `downloadLink` when present.
- Archive videos expose an explicit fallback/description state without inventing captions.

- [x] **Step 1: Add accessible action labels and fallback copy in the affected components, preserving external-link safety and no real form submission in tests.**
- [x] **Step 2: Make the player’s primary action discoverable without hover-only behavior and expose media loading/error status through `role="status"` or `role="alert"` where appropriate.**
- [x] **Step 3: Clarify booking payment copy as post-confirmation handling and ensure the frontend never exposes a payment link before Max confirms the booking.**
- [ ] **Step 4: Add component-level source checks or browser assertions for download link, project link, fallback, and status presence.**

### Task 4: Strengthen global navigation, routing, and footer wayfinding

**Files:**
- Modify: `app/src/App.tsx`
- Modify: `app/src/components/FloatingNav.tsx`
- Modify: `app/src/index.css`
- Create or modify: `app/src/utils/navigation.ts` and its test if extraction is required

**Interfaces:**
- `#contact` opens the contact drawer through the same callback as the Contact button.
- The menu applies `inert` to the application root while open and restores it on close.
- Footer includes an About route without reducing existing target sizes.

- [x] **Step 1: Write a failing navigation test for legacy `#contact` normalization/open behavior.**
- [x] **Step 2: Implement route normalization and root inertness while preserving the menu focus loop and Escape return.**
- [x] **Step 3: Add About to footer wayfinding and verify desktop/mobile keyboard focus rings.**
- [ ] **Step 4: Run the focused tests and live browser checks at desktop and 390px mobile widths.**

### Task 5: Improve content structure without inventing portfolio facts

**Files:**
- Modify: `app/public/content/archive.json`
- Modify: `app/public/content/projects.json` only if link labels need correction
- Modify: `app/public/content/music.json` only if existing action metadata is malformed
- Modify: `app/src/components/MediaArchive.tsx`
- Modify: `app/src/index.css`

**Interfaces:**
- Existing factual content remains source-preserving; no invented clip captions or commercial claims are added.
- Archive cards make sequence, duration, and “short moving fragment” status clear while allowing Max to add richer titles later.

- [x] **Step 1: Identify only factual metadata already present in the repository and remove misleadingly specific wording where it is not supported.**
- [x] **Step 2: Improve archive hierarchy and distinguishable labels in the component/CSS without requiring unsupported content claims.**
- [ ] **Step 3: Verify the full video archive remains readable and responsive without horizontal overflow.**

### Task 6: Test, deploy, and verify live state

**Files:**
- Modify: `integrations/google-sheets/Code.gs` only if Task 1 identifies a source defect
- Modify: `integrations/google-sheets/Admin.html` only if the live dashboard needs matching status copy
- No committed changes to generated audit screenshots

- [ ] **Step 1: Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and `git diff --check`.**
- [ ] **Step 2: Deploy the updated Apps Script from Max’s authenticated Apps Script project, only if the user’s current authenticated session permits it; record the deployment outcome separately from source changes.**
- [ ] **Step 3: Commit scoped source changes, push `main`, and wait for the GitHub Pages workflow to complete successfully.**
- [ ] **Step 4: Capture fresh live evidence for every route, menu, contact, booking error/ready state, project modal, video modal, player, mobile, and reduced-motion state.**
- [ ] **Step 5: Re-run the original booking endpoint check and confirm the live response is not `Script function not found: doGet`; if no live sheet slots exist, report that as a truthful data-state rather than a deployment failure.**
