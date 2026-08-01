# Max Instagram media archive

This directory keeps the unique source stills from the supplied Instagram export.
The full highlight videos are served from `app/public/media/max-instagram/full-videos/`
and tracked with Git LFS. The page uses the generated stills, GIF previews, and
short muted MP4 loops from `app/public/media/max-instagram/` so the source videos
are never part of the initial render path.

The archive was deduplicated against the existing `app/public/media/images/instagram/`
library before import. The two new stills are the studio and hands frames in
`originals/photos/`.
