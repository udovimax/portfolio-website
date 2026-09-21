# SDD ledger — plan: docs/superpowers/plans/2026-09-21-mobile-landing-funnel.md

## Setup

- Workspace: `/Volumes/Adobe Scratch Disk/Max Portfolio Website/portfolio-website/.worktrees/max-mobile-funnel`
- Branch: `feature/mobile-landing-funnel`
- Base: `f312da8` (`Add privacy-safe travel-aware availability management`)
- Spec: `docs/superpowers/specs/2026-09-21-mobile-landing-funnel-design.md`
- Goal: implement the phone-only horizontal landing funnel and guided enquiry flow without changing desktop behavior.

## Pre-flight shared interfaces

- Task 1 → Task 2: pure route/step contracts define bounded funnel indexes and route actions consumed by the landing component.
- Task 1 → Task 3: pure contact validation defines the guided-flow step gates consumed by the shared contact controller and both presentations.
- Task 2 → Task 4: the mobile landing component exposes callbacks for contact and hash navigation consumed by App's responsive composition.
- Task 3 → Task 4: mobile and desktop contact surfaces share controller state and use one responsive surface at a time.

## Rulings

- The mobile flow will use the existing Carousel track as the only horizontal scrolling primitive; this satisfies the repository's no-duplicate-carousel constraint at the cost of adding presentation options to a shared component.
- The desktop home and drawer remain the source of truth above 760px; this keeps the redesign isolated but means the two breakpoint presentations intentionally differ.
- The packaged execution scripts provide `task-brief` but not `task-start` or `task-done`; use the available brief extractor and manual ledger entries while preserving the same RED/GREEN evidence.

## Task tracking

- [x] Task 1: mobile funnel and contact-flow contracts
- [x] Task 2: reusable mobile stepper and landing funnel
- [x] Task 3: shared guided contact flow
- [x] Task 4: responsive integration and accessibility hardening
- [x] Task 5: browser QA, build, and deployment handoff

Task 1: complete (commit d51474b; focused and complete frontend tests -> 20/20 pass)
Task 2: complete (commit b72e296; focused and complete frontend tests -> 20/20 pass; typecheck and lint pass)
Task 3: complete (commit 6ecbab6; complete frontend tests -> 21/21 pass; typecheck and lint pass)
Task 4: complete (commit a6f6c41; complete frontend tests -> 22/22 pass; typecheck, lint, and production build pass; browser QA at 375x667, 390x844, and 1440x900)
Task 5: complete (browser QA at 375x667, 390x844, 761x800, and 1440x900; 22/22 tests; typecheck, lint, build, and diff check pass; no real enquiry submitted)

## Task 5 evidence

- The mobile identity and route screens, guided enquiry steps, support action, keyboard fallback, reduced-motion state, Escape close, and breakpoint surface handoff were checked in the built preview.
- The browser-only availability fixture returned an available 10:00–12:00 Camden studio / Studio session window and a booked 13:00–14:00 window. The public view exposed duration, rough location, booking type, and busy context while hiding the fixture hourly price and personal booking identity.
- The fixture route was used only in the browser; no FormSubmit or Google Sheets POST was submitted.
- No remote push or GitHub Pages deployment was performed in this local verification pass.
