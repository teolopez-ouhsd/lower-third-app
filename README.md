# OUHSD Lower Thirds Tools

On-brand lower thirds for Oxnard Union High School District. Three static pages, no server and no build step needed to use them.

| Page | What it is |
|---|---|
| `index.html` | Landing page with a short how-to video for each tool |
| `video.html` | Video Lower Thirds: design and export transparent files for Final Cut Pro, Premiere Pro, DaVinci Resolve and CapCut |
| `live.html` | Live Lower Thirds: run lower thirds on a livestream through an OBS output window |

## Publish with GitHub Pages

1. Put these files in the repository (the three HTML files can sit at the root).
2. In the repository settings, open Pages and publish from the main branch.
3. Open `https://<your-account>.github.io/<repo>/`.

Keep the three HTML files in the same folder, because they link to each other with relative links.

## Using the live tool in OBS (Mac)

**Window Capture with green key (works anywhere)**
1. In `live.html`, press Open output window. A window opens with a solid green background.
2. In OBS add a Window Capture source and pick that window.
3. Right-click the source, choose Filters, add a Chroma Key filter.
4. Keep the window uncovered or in full screen (press F), or the browser may pause the animation.

**Browser Source with transparency (needs the published web address)**
1. In `live.html`, set Background color to Transparent.
2. In OBS add a Browser Source with the address `https://<your-account>.github.io/<repo>/live.html#output`, width 1920, height 1080.
3. Keep `live.html` open in a browser tab to control it. Both tabs must be in the same browser.

## Source

`src/` holds the readable source: `core.js` (layout and animation engine), `overlay.js` (HTML and CSS renderer for the live output), `ui.js` (the tool), `template.html` (page and styles). `build.py` and `build_landing.py` assemble the pages and were written for the original working folder, so adjust the paths at the top before running them.

Fonts load from Google Fonts (Montserrat and Open Sans). Logo, colors and type follow the District Brand Style Guide.
