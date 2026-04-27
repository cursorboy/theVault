# Swapping Mocks for Real Screenshots

The video currently uses styled HTML mocks (the dark phone frame, the paper-cream dashboard). To replace any of those with real screenshots of the actual product, drop image files into `screenshots/` and replace the corresponding mock element in `index.html` with an `<img>` tag.

## How It Works

A screenshot replaces a mock by changing the markup, not the timing. Whatever `data-start` / `data-duration` / `data-track-index` was on the wrapper stays the same — the inner content swaps from mock to image.

### Pattern

**Mock (current):**

```html
<div id="s4-dash" class="dash" style="height: 880px">
  <div class="dash-side">...</div>
  <div class="dash-main">...</div>
</div>
```

**Replace with screenshot:**

```html
<img
  id="s4-dash"
  src="screenshots/dashboard-all.png"
  style="width: 100%; height: 880px; object-fit: cover; border-radius: 14px; border: 1px solid var(--edge); box-shadow: 0 30px 60px rgba(31,27,20,0.08);"
/>
```

The `id` stays the same so the GSAP entrance animation (`tl.from("#s4-dash", {opacity:0, y:30, ...})`) still hits it.

## File Naming + Recommended Sizes

Put files in `video/screenshots/`. Suggested filenames (use whatever you like, just match what you put in the `<img src>`):

| scene | what to capture | filename | size |
|---|---|---|---|
| 3 (imsg save) | full iMessage thread w/ a save flow (link → "got it processing" → save card) | `imsg-save.png` | ~480×940 (or 2x for retina) |
| 4 (dashboard "all") | dashboard library, all-categories view, ~8 cards visible | `dashboard-all.png` | 1600×880 |
| 5 (dashboard "recipes") | same dashboard but filtered to recipes category | `dashboard-recipes.png` | 1600×880 |
| 6 (semantic search) | search field with query typed, 2 cards highlighted | `dashboard-search.png` | 1600×880 |
| 7 (imsg recall) | full iMessage thread of "what was that ramen spot" exchange | `imsg-recall.png` | ~480×940 |
| 8 (save detail) | the dashboard save detail page | `save-detail.png` | 1600×880 |

PNG or JPG both fine. Bigger source = sharper render. 2x dimensions (e.g. `3200×1760`) is best.

## Where to Get Real Screenshots

### Dashboard (scenes 4, 5, 6, 8)

1. Run the web dashboard locally: `cd apps/web && npm run dev`
2. Open `http://localhost:3000` in Chrome
3. Resize the window to ~1600×900 (or use Chrome devtools device emulation)
4. Cmd+Shift+4 → Space → click the window for a clean screenshot. Or use a tool like CleanShot / Shottr that captures a specific window cleanly without OS chrome.

### iMessage threads (scenes 3, 7)

You actually need to text the bot:

1. Get the bot deployed (Railway or running locally w/ ngrok)
2. Text the bot the demo flows from your phone (forward a real TikTok, ask "what was that ramen spot")
3. Screenshot the iMessage thread on your phone (volume-up + power, on iPhone)
4. Crop tightly to the chat area
5. AirDrop or otherwise transfer to your Mac, drop into `screenshots/`

If you want a cleaner look without the iOS status bar / nav, use a simulator (Xcode → iOS Simulator) or a cleanup tool.

## Per-Scene Replacement Snippets

Open `video/index.html` and find the section header comments (`<!-- SCENE 3: imsg save w/ zoom + loading ... -->`, etc). Inside each, locate the wrapper element by its `id`:

### Scene 3 — replace the phone mock

Find:
```html
<div id="s3-phone" class="phone">
  <div class="statusbar">...</div>
  ... (lots of mock markup)
</div>
```

Replace with:
```html
<img
  id="s3-phone"
  src="screenshots/imsg-save.png"
  style="width: 480px; height: 940px; object-fit: cover; border-radius: 56px; border: 1px solid #2a2a2a; box-shadow: 0 50px 100px rgba(31,27,20,0.18), 0 20px 40px rgba(31,27,20,0.1);"
/>
```

NOTE: when you swap the phone for an image, all the inner-bubble GSAP tweens (`#s3-b1`, `#s3-b2`, `#s3-typing1`, `#s3-bar`, etc) will silently fail because those ids no longer exist. You'll want to either (a) keep them as "selector not found" no-ops (GSAP just skips them), or (b) remove those tween calls from the `<script>` block. Both work. The cleaner option is (b) — search for `#s3-b` / `#s3-typing` / `#s3-bar` / `#s3-d` in the script and delete those lines.

### Scene 4 — replace the dashboard mock

Same pattern. Find `<div id="s4-dash" class="dash" ...>...</div>`, replace with `<img id="s4-dash" src="screenshots/dashboard-all.png" .../>`. Remove `#s4-c1`...`#s4-c8` and `#s4-n1`...`#s4-n9` and `#s4-cursor` tweens from the script.

### Scene 5 — `screenshots/dashboard-recipes.png`

Replace the entire `<div class="dash" style="height: 880px">...</div>` inside `#s5`. Keep `#s5` as the outer wrapper.

### Scene 6 — `screenshots/dashboard-search.png`

Same pattern. Note: the typewriter effect (`typewriter("#s6-q", ...)`) writes into a `#s6-q` element inside the search bar. If you replace with a static screenshot of a search-already-typed view, delete the `typewriter` call from the script.

### Scene 7 — `screenshots/imsg-recall.png`

Replace `<div id="s7-phone" class="phone">...</div>`. Remove the `#s7-b*`, `#s7-typing*`, `#s7-d*` tweens.

### Scene 8 — `screenshots/save-detail.png`

Replace `<div id="s8-detail" class="detail" ...>...</div>`. Remove `#s8-cr`, `#s8-title`, `#s8-summary`, `#s8-actions-h`, `#s8-a*`, `#s8-rem`, `#s8-tags-h`, `.detail .right .tag` tweens.

## What to Keep

Don't touch:
- Scene 1 (brand reveal) — it's the wordmark, no screenshots needed
- Scene 2 (pitch + stats) — stats are typographic, no screenshots needed
- Scene 9 (outro) — same as scene 1

The scene-tag labels at the bottom (`01 save flow · imessage`) and the left-side imsg copy text (the headline + subhead) also stay — they're context for the screenshots.

## After You Swap

```bash
cd video
npx hyperframes lint    # confirm no errors
npx hyperframes render --output renders/thevault.mp4
```

If you swap a phone mock for an image and the image is a different size, tweak the `width` / `height` in the inline style until it fits. The video is 1920×1080 — anything larger than the available space will overflow.

## Tip — Mix Mocks and Real Screenshots

You don't have to swap all of them. Real dashboard screenshots + mock iMessage threads is a fine combination — the mocks are stylized and read clearly, and dashboards photograph better than crammed iMessage threads anyway.
