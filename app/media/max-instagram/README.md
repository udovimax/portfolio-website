# Max Instagram media archive

This directory preserves two source stills from Max’s supplied Instagram export. It is not a runtime public directory: the deployed derivatives live under `app/public/media/max-instagram/`.

## Runtime derivatives

- `app/public/media/max-instagram/stills/` — poster-sized JPEGs used by cards and the Video page.
- `app/public/media/max-instagram/loops/` — short, muted MP4 loops used as decorative previews and Home journey backgrounds.
- `app/public/media/max-instagram/full-videos/` — source highlight videos opened only from the video modal; these are Git LFS objects.

`archive.json` is the canonical mapping from a highlight ID to its poster, loop, and full-video paths. Keep those three paths aligned when replacing a clip. The initial render should use a still or poster; full videos must remain lazy/modal-loaded.

The imported Instagram stills were deduplicated against `app/public/media/images/instagram/`. Do not re-import an existing frame under a new name without checking the existing library first.
