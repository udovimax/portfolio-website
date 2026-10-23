# Max Udovichenko Portfolio Positioning Design

## Goal

Make Max’s existing music and audio work easier for potential collaborators to understand, hear, and enquire about, while preserving the current visual identity and avoiding inflated claims about experience or credits.

## Audience and success

The primary audience is a first-time visitor considering a music, film, game, artist, or studio collaboration. Within the first screen, a visitor should understand Max’s creative practice, find representative audio, and have a direct path to discuss a project. Project cards should make Max’s contribution and any academic or collaborative context clear. Education remains visible and accurately framed.

## Current implementation and constraints

- The deployable site is a client-rendered React/Vite application in `app/`; `app/src/App.tsx` composes the site and owns hash navigation and the audio player.
- Supported sections are `home`, `music`, `projects`, `video`, and `about`. Preserve those hash URLs and the legacy `work` and `contact` mappings; `/about` is not a distinct page route.
- `app/public/content/*.json` is the canonical source for routine copy and project records. Keep JSON shapes aligned with `app/src/types/content.ts` if they change.
- Current visual identity, typography, palette, photography, animation language, desktop navigation, and mobile landing funnel are established and should be retained. Adjust hierarchy and copy only where it improves the visitor journey.
- Existing contact form, enquiry categories, Google Sheets capture, email behavior, dashboard, analytics, and payment/support links are outside this change. Reuse current contact behavior; do not alter its backend.
- Do not publish or deploy as part of this work.

## Positioning and copy direction

Use the approved working headline:

> Original music and sound for film, games and creative projects.

Use concise supporting copy that identifies composition, production, and sound design, with Max’s Music Technology studies at Kingston University London presented as relevant context rather than the lead. Avoid claims such as “London-based,” specialist software, paid commissions, client results, or years of experience unless Max confirms them.

Keep “Artist,” “Producer,” and “Creative” as a secondary identity descriptor where it fits. Retain the existing philosophy—“I build emotional worlds through texture, rhythm, and space. Every project starts with narrative, then becomes sound.”—as a supporting expression of his approach, not a substitute for explaining what he does.

The primary homepage action is “Hear selected work” and navigates to the Music section. A secondary “Discuss a project” action opens the existing contact flow. Neither action should autoplay audio or create a new submission path.

## Page behavior and content

### Home

- Lead with the approved, service-specific headline and a short factual supporting statement.
- Surface the existing “5.1 Surround Composition” track as the representative listening entry, retaining its title, existing 2026 label, description, and credit. Playback starts only after an intentional action and uses the existing player.
- Keep CV links secondary to listening and contact actions.
- Preserve the existing visual system and mobile funnel; do not add invented showreels, statistics, testimonials, or decorative sections.

### Music

- Keep the existing local tracks, their current descriptions and credits, and the SoundCloud playlist option.
- Make track titles, playback controls, and Max’s contribution understandable. Preserve no-autoplay behavior and lazy loading of the external embed.

### Projects

- Retain the four existing projects and their truthful distinctions: “Gimmick! Reimagining” is 8-bit coursework; “Uni-Verse” is a student game project; “Third Day” is a film collaboration; “Climate Change Awareness Film” is an original-score project.
- Clarify Max’s recorded contribution using existing descriptions and project data only: original music and SFX for Gimmick!, music and sound effects for Uni-Verse, score and sound design for Third Day, and original music for the climate-awareness film.
- Replace repeated generic video action text with project-specific accessible labels that identify the video being opened. Keep existing project-to-video associations.
- Do not imply that coursework or collaboration is paid client work, claim unrecorded outcomes, or attribute collaborators’ work to Max.

### Video

- Keep the separate short-video archive and existing project video associations.
- Replace the repeated card-level archive description with concise section-level context where practical. Retain numbered clip labels until Max supplies verified titles or context; do not invent names, roles, or project links for the 17 clips.
- Keep full video sources lazy/modal-loaded, with posters and existing caption tracks.

### About

- Start with a concise first-person account of what Max creates and the kinds of work represented in the portfolio. Place the existing philosophy after this introduction.
- Keep the third-year Music Technology study at Kingston University London and the timeline. Continue to label 2027 as an expected graduation target, not a completed qualification.
- Present the existing skill list in a more scannable grouping only if the grouping uses current verified skills. Do not add DAWs, middleware, tools, or competencies absent from the source content.
- Preserve current CV, social, support, and Instagram links and fallbacks.

### Contact and navigation

- Route “Discuss a project” through the existing contact drawer and retain its existing enquiry categories, validation, success/error handling, and privacy behavior.
- Keep all current section hashes, navigation, footer links, and direct-link behavior intact.

## Search and sharing metadata

- Use `https://maxudovichenko.art/` as the production canonical URL and as the URL in Open Graph, social preview, structured data, sitemap, and the `robots.txt` sitemap reference.
- Update the document title and description to match the verified positioning.
- Represent Max as an individual `Person` in Schema.org structured data, retaining only verified identity and social profile links. Do not describe him as a group or add unsupported genre, credential, or location claims.
- The site is client-rendered and hash-routed. Keep one canonical sitemap entry for the root domain; do not claim that hash sections are independently indexable pages or introduce new routes as an SEO shortcut.

## Accessibility and media quality

- Preserve keyboard access, visible focus, modal focus management, descriptive control labels, captions, and existing reduced-motion behavior.
- Check the revised page at desktop and mobile sizes for clipped copy, horizontal overflow, and clear primary actions.
- Verify local audio and project video playback through intentional user controls; verify the external SoundCloud fallback/embedding without making it a blocking dependency.
- Do not claim full accessibility conformance based only on visual inspection.

## Non-goals

- No redesign from scratch, new router, server-side rendering, CMS, new audio/video production, backend or email changes, changes to booking/payment behavior, analytics changes, domain/DNS edits, or deployment.
- No invented testimonials, client names, releases, awards, metrics, outcomes, software proficiency, or commercial credits.

## Acceptance criteria

1. A new visitor can identify Max’s music/audio practice and reach selected audio or contact from the homepage without autoplay.
2. Existing projects state Max’s verified contribution and academic/collaborative context without implying unverified commercial work.
3. Existing pages, hash routes, navigation, contact flow, media associations, and mobile funnel remain functional.
4. The About section balances creative approach, present study, skills, and future graduation target without implying the target is complete.
5. Archive clips remain accurately labelled unless Max supplies confirmed titles/context.
6. Canonical/social metadata and sitemap use the live custom domain; structured data describes an individual.
7. Lint, typecheck, tests, and production build pass, and desktop/mobile route and media checks are recorded. Deployment remains a separate approval and action.

## Open content dependency

The 17 short archive videos currently have numbered “Highlight study” titles and identical descriptions. Max should provide true names or context if he wants individual card copy; until then, the implementation must preserve non-fabricated numbering and avoid assigning them to named portfolio projects.
