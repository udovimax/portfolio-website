# Max Portfolio Audit Remediation Specification

## Outcome

Bring the live GitHub Pages portfolio and its Max-owned Google Apps Script booking integration into alignment with the Apple design principles used in the audit: clear hierarchy, accessible interaction, truthful feedback, resilient media, and platform-appropriate responsive behavior.

## Scope

- Repair and redeploy the existing Google Apps Script `doGet` availability boundary; do not invent public booking slots or expose credentials.
- Keep FormSubmit as the contact email fallback and keep booking reservation authoritative in Apps Script.
- Make project and video overlays real accessible dialogs with focus containment, Escape dismissal, background inertness, and focus restoration.
- Render configured project links and local track download actions.
- Make media loading, empty, and error states explicit.
- Improve menu semantics, legacy contact routing, player discoverability, and footer wayfinding.
- Preserve reduced-motion behavior, touch navigation, existing content ownership, and unrelated dirty files.

## Non-goals

- Do not publish invented studio availability, rates, or commercial terms.
- Do not expose a payment URL before Max confirms a booking; the public flow must explain that payment follows confirmation.
- Do not fabricate captions or descriptive titles for archive clips without source information.
- Do not change the WordPress site or domain/DNS configuration.

## Acceptance criteria

1. The public booking request returns valid JSONP from the deployed Apps Script endpoint and the live calendar can show real published slots when the Availability sheet contains them; the no-slots state remains honest and actionable.
2. Project and video overlays meet the same dialog behavior as the existing contact drawer: semantic dialog labeling, focus trap, Escape/backdrop close, inert background, and focus return.
3. Project links and available track downloads are visible and keyboard accessible.
4. Media embeds and archive previews provide visible loading/fallback/error affordances without relying on color or hover alone.
5. The primary menu is modal to assistive technology, `#contact` opens the contact experience rather than landing on an unrelated page, and the footer exposes About.
6. Automated tests, lint, typecheck, production build, and current live-browser verification pass before deployment is claimed.
