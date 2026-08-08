# Content and media contract

The JSON files in this directory are the canonical content database for the portfolio. Components should consume these records through `useSiteContent()` rather than hard-coding routine content.

## Content files

- `about.json`: identity, roles, introduction, philosophy, skills, timeline, and CV paths.
- `music.json`: tracks, local audio sources, SoundCloud embed, and works in progress.
- `projects.json`: project cards and modal metadata. `videoId` must match an entry in `videos.json` when present.
- `videos.json`: cinematic video metadata, MP4 source, poster, duration, and optional WebVTT captions.
- `archive.json`: Instagram-highlight stills and muted preview/full-video records used by the Video page.
- `socials.json`: email, external profiles, donations, Instagram post permalinks, and FormSubmit settings.

## Path and media rules

- Store runtime paths as `/media/...` (not `./media/...` and not absolute filesystem paths). `useSiteContent()` converts them for the current Vite base path.
- Check every new path for exact case and existence under `public/media/` before committing.
- Use compressed posters/stills/loops for cards and previews. Full-resolution originals belong in the source/LFS areas and should not be eagerly requested.
- Add large binaries to `.gitattributes` before adding them; verify with `git check-attr filter -- <path>` and `git lfs ls-files`.
- Keep video captions in `media/captions/` and set the `captions` field in `videos.json`; an empty or missing track is an accessibility regression.
- External Instagram embeds must have a working permalink and the UI fallback must remain meaningful if Instagram’s script cannot load.
- Preserve the existing public email plus-address and PayPal/social URLs unless the owner explicitly supplies replacements.

The JSON files are intentionally loaded in parallel at runtime. Keep their top-level shapes aligned with `app/src/types/content.ts`; schema validation is not currently configured.
