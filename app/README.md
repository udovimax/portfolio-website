# Max Udovichenko portfolio

This directory contains the deployable client-side portfolio. It is a React 19 + TypeScript + Vite application with Tailwind CSS, Framer Motion, Lenis, Howler, and React Icons.

## Runtime map

```text
src/main.tsx
  └─ src/App.tsx
       ├─ FloatingNav ── hash navigation and contact/menu gestures
       ├─ ContactDrawer ── FormSubmit contact form and PayPal support
       ├─ Carousel ── bounded horizontal scrolling, snapping, and auto-advance
       ├─ Player ── visual/audio controls; playback state is owned by App
       ├─ MediaArchive ── highlight-video carousel
       ├─ MediaModals ── lazy-loaded video/project dialogs
       └─ useSiteContent ── JSON loading and deploy-base asset resolution
```

`App.tsx` is currently the composition root. It owns the hash-based page state (`home`, `music`, `projects`, `video`, `about`), Howler lifecycle, analyser data, modal state, and the global player. Page-specific markup remains there so navigation and cross-page media state stay coordinated. A future page split should preserve those ownership rules and be treated as a behavior change, not a formatting refactor.

## Content and media

The canonical editable content is in `public/content/`:

- `about.json` — name, roles, introduction, philosophy, skills, timeline, and CV paths.
- `music.json` — local tracks, SoundCloud fallback, and works in progress.
- `projects.json` — project metadata, thumbnails, galleries, and video links.
- `videos.json` — cinematic videos and caption tracks.
- `archive.json` — Instagram highlight stills, posters, loops, and full videos.
- `socials.json` — external profiles, email, donation link, and FormSubmit recipient.

Paths in those files are public-root paths such as `/media/...`; `useSiteContent.ts` resolves them through `assetUrl()` so GitHub Pages subpaths continue to work. Routine content changes should edit JSON and add the referenced file; components should not need changing.

Media responsibilities are intentionally split:

- `public/media/` contains files the browser may request at runtime.
- `media/max-instagram/originals/` contains source stills retained for provenance, not the initial render path.
- `assets/source/more-photos/` contains LFS-tracked source photography used to generate/curate deployable derivatives.
- `src/assets/` contains code-bundled fonts and the site background.

Full videos and large audio are Git LFS objects. Preview loops, posters, and stills are the performance-sensitive render assets. Do not make full videos eager or use them as page backgrounds without checking the loading impact.

## Commands

Run from this directory:

```bash
npm ci
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

`npm run test` is currently a smoke placeholder and does not execute a test suite. The GitHub Pages workflow runs lint, typecheck, test, build, copies `dist/index.html` to `dist/404.html`, and deploys `dist`.

## Deployment

GitHub Actions is the canonical deployment path. The workflow checks out Git LFS (`.github/workflows/github-pages.yml`) and builds from `app/`. Vite derives the repository base path from `GITHUB_REPOSITORY` during Actions builds; local development uses `/`. Keep the SPA fallback step when changing deployment configuration.

The tracked `gh-pages` fallback branch and local `output/`/`.playwright-cli/` directories are not source-of-truth application code. Do not edit generated artifacts to fix a source problem.

## Safe extension points

1. Add or update content in `public/content/*.json` and the matching media path.
2. Reuse `Carousel` for horizontal content so bounds and snap behavior stay consistent.
3. Reuse `assetUrl()` for every public media reference.
4. Keep audio creation and analyser wiring in `App.tsx`; `Player` is a presentation/control surface.
5. Keep focus handling, Escape behavior, and touch gestures in the navigation/drawer components.
6. Add lazy loading or a poster before introducing a new video surface.
7. Update types in `src/types/content.ts` when the JSON contract changes.

See the repository-root `AGENTS.md` and `public/AGENTS.md` for the project-wide and content/media-specific invariants.
