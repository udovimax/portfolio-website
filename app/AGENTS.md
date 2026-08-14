# App engineering guide

This directory is the deployable Vite application. Read the repository-root `AGENTS.md` first; these rules add front-end-specific constraints.

## Boundaries

- `src/App.tsx` coordinates route/page state, audio lifecycle, analyser state, modals, content projection, and global overlays.
- `src/components/` owns reusable UI behavior. Components receive content and callbacks; they should not fetch the content JSON or construct unrelated global state.
- `src/hooks/useSiteContent.ts` is the only canonical content loader and public asset-path resolver.
- `src/hooks/usePageAnalytics.ts` sends one non-blocking, cookie-free page-view event per page to the public Google Sheets capture endpoint; it must never gate rendering or contact submission.
- `src/types/content.ts` defines the runtime shape expected by `public/content/*.json`.
- `public/content/` is editable data, not imported TypeScript modules; keep values serializable and paths portable.
- `public/media/` is served verbatim by Vite. The browser can request those files directly, so casing and leading paths matter.

## Performance and accessibility

- Keep full video/audio files out of initial render paths; use posters, stills, loops, `loading="lazy"`, `preload="none"`, and IntersectionObserver where appropriate.
- Preserve `prefers-reduced-motion` behavior in Framer Motion, CSS animations, Lenis, and carousels.
- Interactive elements must remain real buttons/links with visible focus states and accessible labels.
- Horizontal carousels must not create page-level horizontal overflow or compete with vertical touch scrolling.
- Preserve focus trapping/return and Escape handling in `FloatingNav` and `ContactDrawer`.
- Do not add a dependency for a small presentational abstraction; reuse the existing components first.
- The private enquiry dashboard is hosted separately by Apps Script under `integrations/google-sheets/`; do not put lead data, Google credentials, or dashboard read/write logic in this public client bundle.

## Build assumptions

- Local URLs use `/`; GitHub Actions builds use `/<repository-name>/` through `vite.config.ts`.
- `npm run build` performs TypeScript project builds before Vite bundling.
- `app/dist` is ignored and generated; source fixes belong in `src`, `public`, configuration, or workflow files.
