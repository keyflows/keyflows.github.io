# KeyFlows

KeyFlows is an account-free typing practice website built with HTML, CSS, and browser-native JavaScript modules. It runs as a static site, with no build step, mandatory API key, or application server. Practice results and preferences remain in local browser storage.

## Prerequisites

- A modern browser with JavaScript modules, `localStorage`, and the `<dialog>` element.
- Python 3, PHP, or another local static file server for development. Opening `index.html` directly may block JavaScript module imports in some browsers.

## Run locally

From the repository root, run either command:

```sh
python3 -m http.server 8000
```

or:

```sh
php -S localhost:8000
```

Then open <http://localhost:8000/>. To run the browser tests, open <http://localhost:8000/tests/>.

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. In **Settings → Pages**, choose **Deploy from a branch**, select `main` (or your publishing branch) and `/ (root)`, then save. GitHub Pages also supports the GitHub Actions static HTML deployment workflow if your repository prefers that route.
3. Wait for the Pages deployment to finish. The KeyFlows organization repository is named `keyflows.github.io`, so its expected site URL is `https://keyflows.github.io/`.
4. This app uses relative paths (`css/...`, `js/...`, `assets/...`), so project-site subpaths work without a build or rewrite rule. The canonical URL, sitemap, and robots file are configured for `https://keyflows.github.io/`. The Open Graph image path is relative and does not require a root path.

The `404.html` page is supplied for GitHub Pages. No server rewrite configuration is required.

## Troubleshooting

- **404 on assets:** Check letter casing and keep paths relative to the HTML page. Do not add a leading slash for project sites.
- **Blank page under `file://`:** Use a local static server so module imports are allowed.
- **Data seems missing:** `localStorage` is scoped to the browser and origin; a different browser, private window, or deployment origin has separate data. Export before clearing browser data.
- **No trend chart:** Charts use only completed tests. Finish a test to create the first point.
- **Theme looks unexpected:** Choose Dark, Light, or System in Settings. System follows the browser preference.

## Browser support

Use a current release of Firefox, Safari, Chrome, or Edge. Core functionality uses ES modules, `performance.now()`, `localStorage`, `<dialog>`, and the File/Blob APIs. Web Share is optional; copying/sharing falls back to clipboard or a readable toast where unavailable. Browsers with unavailable or full local storage can still run the typing exercise, but cannot reliably retain the session history. Only English practice content is bundled in this release.

## Features and limitations

- Timed tests: 15, 30, 60, and 120 seconds.
- Word count tests: 10, 25, 50, and 100 words; user-provided custom text; daily prompts; punctuation and number variants.
- The Little Journey and Garden Bloom typing games, with untimed or optional timed rounds, bundled passages, reduced-motion controls, soft typing sounds enabled by default and switchable in Settings, and local aggregate results.
- Keyboard lessons plus a four-part Reading & Typing course with original material on guided reading, main ideas, source checking, and note-taking.
- Premium-styled informal personal achievement certificates, previewed before PDF or PNG download and branded KeyFlows™ by Ayush Nandanwar: completed-session certificates require at least 90% accuracy; accuracy milestones require 95%; speed milestones require reliable 30 net WPM and at least 90% accuracy; the course certificate requires at least 90% accuracy on all four course lessons. They are not verified or accredited credentials.
- Lessons, adaptive deterministic recommendations, local statistics, SVG trend charts, daily goals, streaks, achievement markers, export/import, and three theme choices.
- Completed sessions show a per-test pace graph with interval net/raw WPM and cumulative accuracy. Low-frequency samples stay in memory for that result only; saved history retains aggregate session summaries, not a keystroke trace.
- Generated timed and word-count practice passages are freshly randomized on each new test and timed rollover. Lessons stay stable for repeatable drills; daily challenge passages stay the same for everyone on the same day.
- Personalized coaching uses deterministic browser logic on saved session statistics. It does not call an AI service or require an API key. The app does not send keystrokes or saved practice results to a KeyFlows backend; recommendations are guidance, not a promise of improvement. KeyFlows is designed for people practicing typing for work, study, reading, and everyday writing; it does not currently provide corporate dashboards or classroom accounts.
- No global leaderboard, verified public scores, multiplayer, account, or cross-device synchronization. These features need a server with identity, storage, and abuse prevention. The present local challenge history is per browser.
- User custom text is kept in settings on the current browser for convenience, never included in session records or exports as test content. Exported data includes current settings, including saved custom text.

## Score definitions

- **Raw WPM** = attempted characters / 5 / elapsed minutes.
- **Net WPM** = max(0, attempted characters − incorrect characters) / 5 / elapsed minutes.
- **Accuracy** = correct keystrokes / attempted keystrokes × 100.
- Mistakes remain in the error penalty after correction. Backspace changes the cursor position but does not erase an earlier attempt or error. Skipped characters are not attempts; a word is counted when its separating space (or the end of its prompt) is typed. Live speed is withheld during the first three seconds. Timed tests end at their selected time, and word/custom/challenge/lesson tests finish at the end of their text.

## Customize

- Change the product name, copy, and metadata in `index.html`.
- Adjust colors and typography in `css/styles.css`; responsive rules live in `css/responsive.css`.
- Add words, daily prompts, and lessons in `js/text-generator.js`.
- Change the canonical URL and social preview metadata in `index.html` for your GitHub Pages URL.
- The favicon and share-card artwork are editable SVGs in `assets/`.

## Privacy and schema

The versioned `keyflows.data` localStorage record contains preferences (including the typing-sound toggle), aggregate session summaries (including game results and Reading & Typing lesson completion), streaks, challenge bests, and earned badges. It does not retain keystroke streams or game passage text. Certificate previews and files are generated locally. An optional display name is used only for that export and is not saved in settings, history, or a KeyFlows certificate record; the downloaded file itself contains the name you chose. The Statistics page’s **Download spreadsheet** action exports session summaries as CSV, which opens in Excel, Numbers, and other spreadsheet apps. **Settings → Download full backup** creates a restorable JSON backup; restoring it replaces this device’s current data after confirmation. Full backups include saved custom text. The app does not sync this data across devices; exports are created only when you request them.

## License

MIT. See [LICENSE](./LICENSE).
