# Design QA — Max Udovichenko portfolio

## Comparison target

- Source visual truth: `/var/folders/jh/m1g0hwlx02ddpx4nsr880w_c0000gn/T/TemporaryItems/NSIRD_screencaptureui_WxREDo/Screenshot 2026-08-01 at 13.37.24.png`
- Rendered implementation: `/Volumes/Adobe Scratch Disk/Max Portfolio Website/portfolio-website/output/audit/10-home-final.png`
- Route and state: local Home route, dark theme, player minimised by default, no drawer open.
- Source pixels: 1971 × 1152, includes Safari chrome above the page.
- Implementation pixels: 1280 × 720, browser-rendered content viewport, device scale factor 1.
- Normalisation: compared the page content region rather than browser chrome; exact pixel comparison was not appropriate because the supplied source and preview use different viewport sizes.

## Full-view comparison

The implementation preserves the source direction: oversized Max Udovichenko wordmark, dark sky atmosphere, floating navigation, restrained monochrome palette, blue accent, two journey links, and compact bottom-right music player. The requested change is reflected in the hero: the old faded secondary page-art layer and portrait card are removed, while a single wide image band now spans the hero content width and crossfades between supplied images.

The scroll guide now uses page-aware copy (`Continue / explore`, `Continue / work`, `Continue / story`, then `Next / …`) so it describes the current three-route structure rather than the earlier one-page layout.

## Focused comparison evidence

- Hero: `/Volumes/Adobe Scratch Disk/Max Portfolio Website/portfolio-website/output/audit/10-home-final.png` shows the full-width image band beginning below the introduction, with the sky remaining the global atmosphere.
- Player: the final browser state shows the minimised square player with artwork, marquee title, time, and hover/tap controls. Expanded state was separately tested in the browser.
- Navigation and guide: the browser DOM snapshot confirmed the primary navigation and the page-aware scroll-guide label are available as semantic controls.

## Required fidelity surfaces

- Fonts and typography: Neue Haas Display remains the primary family with local fallback; the display wordmark retains the oversized weight and increased tracking direction from the source.
- Spacing and layout rhythm: the hero now uses a single-column introduction followed by a wide media band, avoiding the previous competing portrait/page-art composition. The player remains isolated at bottom-right.
- Colors and visual tokens: deep charcoal/sky atmosphere, warm white text, muted blue accent, dark glass navigation and player are retained.
- Image quality and asset fidelity: the hero band uses supplied Max and Instagram-derived assets with `object-fit: cover`, per-image focal positions, lazy loading for later frames, and crossfade motion instead of stretching.
- Copy and content: the name is Max Udovichenko; scroll-guide copy matches Home / Work / About; no “CINEMATIC PORTFOLIO” label was reintroduced.

## Interaction verification

- Play: passed; the expanded control changed to Pause and the timer advanced.
- Pause: passed; the control returned to Play.
- Next / previous: passed; track titles changed and returned to the original track.
- Minimise / expand: passed.
- Hide / show: passed.
- Scroll guide: passed; Home and Work display page-specific continuation labels.
- Console: the in-app browser session did not expose a console-message reader; no visible runtime error state appeared during the checks.

## Findings

No actionable P0, P1, or P2 visual findings remain for this iteration. The browser chrome and viewport differ between the supplied source and local capture, so the comparison was made against the page content region and the requested new hero composition.

## Comparison history

1. Earlier state: a faded secondary page-art layer and a separate portrait card competed with the sky background.
2. Fix: removed page-level artwork variables and pseudo-element layers; introduced one full-width rotating hero image band with focal positioning and lazy loading.
3. Post-fix evidence: `output/audit/10-home-final.png`; the old page-art layer is absent and the new band is visible below the introduction.
4. Earlier state: player clicks could fail because Howler was asked to play before the audio resource was loaded and SVG icon clicks could be treated as card clicks.
5. Fix: load/resume/play through a guarded helper, surface load/play errors, and detect interactive descendants using `Element.closest`.
6. Post-fix evidence: browser interaction checks above passed.

## Implementation checklist

- [x] Remove the faded page-art layer above the sky background.
- [x] Add a full-width hero image band with crossfade rotation and per-image crop positioning.
- [x] Update page-aware scroll-guide copy.
- [x] Make player playback controls reliable after user interaction.
- [x] Keep the minimised player as the default state.
- [x] Run typecheck, lint, and production build.

## Follow-up polish

- The existing Vite warnings about runtime-relative font and background paths should be cleaned up separately so production builds can resolve those assets at build time.

final result: passed
