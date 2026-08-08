# Agent guide — Max Udovichenko portfolio

## Project rules

1. The deployable app is `app/`; do not treat the root `portfolio website/`, `__MACOSX/`, zip files, `output/`, or `.playwright-cli/` exports as source code.
2. The app is a client-only React/Vite site; there is no backend, database, server API, or server-side rendering layer.
3. `app/src/main.tsx` is the runtime entry point and imports the global stylesheet before rendering `App`.
4. `app/src/App.tsx` is the current composition root and owns hash routing, cross-page state, Howler playback, the analyser, overlays, and the global player.
5. Supported page IDs are `home`, `music`, `projects`, `video`, and `about`; legacy hashes are intentionally mapped in `getPageFromHash()`.
6. Do not replace hash navigation with a router without preserving direct links and the legacy `work`/`contact` mappings.
7. `app/public/content/*.json` is the canonical content source; keep routine content changes out of JSX.
8. JSON paths are public-root paths and must be resolved with `assetUrl()` before use in bundled/runtime code.
9. Keep the content interfaces in `app/src/types/content.ts` synchronized with all JSON shape changes.
10. `socials.json` is authoritative for the public email, social URLs, PayPal URL, Instagram embeds, and FormSubmit recipient.
11. The FormSubmit target is deliberately a Gmail plus-address; do not expose a secret or move form handling into client credentials.
12. Local audio is created and controlled in `App.tsx` through Howler; `Player.tsx` must remain a UI/control surface and must not create its own `Howl` instance.
13. The analyser is connected to Howler’s Web Audio graph; preserve the `html5: false` constraint for reactive visualizer data.
14. Use `Carousel` for horizontal collections; do not create a second scrolling implementation with different bounds or snap rules.
15. Carousel tracks are horizontal-only interaction surfaces; preserve keyboard arrows, bounded scroll positions, button disabled states, and reduced-motion behavior.
16. `FloatingNav` owns the menu drawer, contact trigger, focus loop, Escape handling, and edge-swipe gestures; do not duplicate those global gestures in page components.
17. `ContactDrawer` owns FormSubmit markup, focus return/close behavior, and PayPal support details; keep it available from every page.
18. Full videos must stay lazy/modal-loaded and have a poster; do not make source videos eager page backgrounds.
19. Video captions live in `app/public/media/captions/*.vtt` and are wired by `videos.json`; keep a caption track when adding a video.
20. `LazyBackgroundVideo` is for muted, looped decorative previews only; it must remain `preload="none"` and IntersectionObserver-gated.
21. Instagram embeds are third-party progressive enhancements with a fallback link; the site must remain usable if Instagram’s script is blocked.
22. Large audio/video/source-photo files belong in Git LFS and must match `.gitattributes`; never commit a new large binary as an ordinary Git blob.
23. Runtime posters, stills, loops, and compressed audio should be preferred over original/full media on the initial render path.
24. Do not edit generated `app/dist`, local QA captures, vendor `node_modules`, macOS metadata, or imported archive trees to fix application behavior.
25. GitHub Pages Actions is the canonical deployment; preserve LFS checkout, `npm ci`, lint, typecheck, test, build, SPA `404.html`, and Pages artifact/deploy steps.

## Navigation map

- `app/README.md` — app architecture, content contract, commands, and safe extension points.
- `app/src/App.tsx` — page composition and cross-feature state owner.
- `app/src/components/` — UI boundaries: nav/drawer, carousel, player, media archive, and modals.
- `app/src/hooks/useSiteContent.ts` — content fetch and asset-base resolution.
- `app/src/types/content.ts` — JSON/runtime contract.
- `app/public/content/` — editable content records; see its local `AGENTS.md`.
- `app/public/media/` — deployable runtime media.
- `.github/workflows/github-pages.yml` — CI and Pages deployment.
- `.gitattributes` — LFS policy for large media.

## Verification baseline

From `app/`, run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`. Also run `git diff --check` and inspect `git status --short` before handoff. The test command is currently a smoke placeholder, so a green result is not evidence of behavioral coverage.
