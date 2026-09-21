# Mobile Landing Funnel Design

## Goal

Give phone visitors a focused, low-scroll entry into Max Udovichenko's work while preserving the existing desktop/tablet portfolio and contact backend.

## Experience

- Apply the new experience only at `max-width: 760px`.
- The mobile home route is a horizontal, swipeable full-screen sequence with two landing screens: identity and route choice.
- The identity screen keeps Max's name, roles, portrait, a concise existing introduction, a primary `Work with Max` action, and a visible progress/continue cue.
- The route screen presents `Work with Max`, `Hear Max`, and `Explore the practice`; the latter two preserve the existing `#music` and `#about` hashes.
- Every funnel screen has a safe-area-aware action rail with primary Contact and secondary Support Max actions.
- `Work with Max` opens a full-screen guided contact flow with intent, details, contact details, review/send, and success states.
- Booking continues to use the existing availability contract, opaque booking token, public location, booking type, provisional estimate, and travel messaging.
- The current desktop home, hash routes, player, menu, FormSubmit fallback, Apps Script capture, and PayPal destination remain available.

## Constraints

- Do not add dependencies or a new backend.
- Reuse the existing Carousel horizontal interaction primitive rather than creating an unrelated swipe implementation.
- Preserve focus trapping, Escape handling, focus return, keyboard controls, reduced-motion behavior, and no page-level horizontal overflow.
- Do not add personal-data analytics or expose exact booking details.
