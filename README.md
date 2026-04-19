# Perez Family Tree

A mobile-first, installable (PWA) family tree web app hosted on GitHub Pages.

**Live site:** `https://mrjuandrful.github.io/perez-family-tree/`

---

## Features

- **Browse** — Search any family member by name; filter by branch (Pérez, Zitt, Santana, etc.)
- **Tree view** — Interactive diagram with generation bands, family connectors, and cross-branch routing
- **Timeline** — All family members grouped by birth decade
- **Profile sheets** — Tap any person to see parents, siblings, spouse, and children
- **Dark mode** — Toggle in the top bar or bottom settings tab
- **Bilingual** — English / Spanish toggle in Settings
- **PWA / installable** — Add to Home Screen on iPhone or Android; works offline after first visit
- **GEDCOM import/export** — Import family data from Ancestry/FamilySearch; export backups

---

## Repository Structure

```
perez-family-tree/
├── public/
│   ├── .nojekyll          # Tells GitHub Pages to skip Jekyll processing
│   ├── 404.html           # SPA redirect handler for GitHub Pages
│   ├── manifest.json      # PWA manifest (name, icons, theme color)
│   ├── sw.js              # Service worker (offline caching)
│   ├── CNAME.example      # Copy to CNAME to use a custom domain
│   └── icons/
│       ├── icon.svg       # Primary SVG icon (works in modern Chrome/Android)
│       ├── icon-192.png   # Required for Android PWA install (generate from SVG)
│       └── icon-512.png   # Required for Android PWA splash screen
├── src/
│   ├── data/
│   │   └── perez-family.json  # Edit this to update family data
│   ├── pages/
│   │   ├── HomePage.tsx       # Welcome screen with branch overview
│   │   ├── BrowsePage.tsx     # Mobile-first people browser
│   │   ├── TreePage.tsx       # Interactive tree diagram
│   │   ├── TimelinePage.tsx   # Birth-decade timeline
│   │   ├── SettingsPage.tsx   # Language, import/export, about
│   │   └── PersonPage.tsx     # Deep-link to a specific person
│   ├── components/
│   │   ├── profile/
│   │   │   ├── ProfilePanel.tsx  # Side panel (desktop tree view)
│   │   │   └── ProfileSheet.tsx  # Bottom sheet (mobile browse view)
│   │   └── tree/               # ReactFlow canvas, nodes, edges
│   ├── store/
│   │   ├── familyTreeStore.ts  # Zustand store + localStorage persistence
│   │   └── uiStore.ts          # Theme, locale, selected person
│   ├── lib/
│   │   ├── layout/elkLayout.ts # Tree layout engine
│   │   └── relationships.ts    # Relative-finding logic
│   └── App.tsx                 # Router, top nav (desktop), bottom nav (mobile)
├── index.html             # PWA meta tags + SW registration
├── vite.config.ts         # base: '/perez-family-tree/'
└── package.json
```

---

## How to Add or Update Family Data

All family data lives in **`src/data/perez-family.json`**. The schema is:

### Adding a person

```json
"P999": {
  "id": "P999",
  "names": {
    "given":    { "en": "First Name",  "es": "First Name"  },
    "surname":  { "en": "LastName",    "es": "LastName"    },
    "nickname": { "en": "MaidenName",  "es": "MaidenName"  }
  },
  "gender": "female",
  "living": true,
  "birth": { "date": { "year": 1990, "month": 6, "day": 15 } },
  "mediaIds": [],
  "tags": ["perez-line"],
  "createdAt": "2026-04-19T00:00:00.000Z",
  "updatedAt": "2026-04-19T00:00:00.000Z"
}
```

**Fields:**

| Field | Notes |
|---|---|
| `id` | Unique string like `P026`. Increment from the last one. |
| `names.given` | First + middle name |
| `names.surname` | Current last name |
| `names.nickname` | Maiden/birth name (shown as "née …") |
| `names.suffix` | Jr., Sr., III, etc. |
| `gender` | `"male"` \| `"female"` \| `"nonbinary"` \| `"unknown"` |
| `living` | `true` or `false` |
| `birth.date` | `{ year, month, day }` — all optional |
| `birth.place` | `{ display: { en: "...", es: "..." } }` |
| `death` | Same structure as `birth` |
| `bio` | `{ en: "...", es: "..." }` — free text |
| `tags` | Array of branch tags, e.g. `["perez-line"]` |
| `mediaIds` | Array of media IDs from the `media` section |
| `profilePhotoId` | Single media ID for the profile photo |

### Adding a family (marriage/partnership)

```json
"F099": {
  "id": "F099",
  "type": "marriage",
  "partners": [
    { "personId": "P001", "role": "partner1" },
    { "personId": "P999", "role": "partner2" }
  ],
  "children": [
    { "personId": "P100", "relationship": "biological" }
  ],
  "createdAt": "2026-04-19T00:00:00.000Z",
  "updatedAt": "2026-04-19T00:00:00.000Z"
}
```

`relationship` values: `"biological"`, `"adopted"`, `"step"`, `"foster"`, `"unknown"`.  
Add `"dissolved": true` for divorces/separations.

### After editing the JSON — bump the seed version

Open `src/store/familyTreeStore.ts` and increment `SEED_VERSION`:

```ts
const SEED_VERSION = 'v15'; // was v14
```

This forces every visitor's browser to discard its cached data and load the new JSON.

### Branch tags

| Tag | Display name |
|---|---|
| `perez-line` | Pérez |
| `zitt-line` | Zitt |
| `santana-line` | Santana |
| `martinez-line` | Martínez |
| `safanova-line` | Safanova |

To add a new branch, add the tag to a person, then add it to `BRANCH_CONFIG` in `src/pages/HomePage.tsx` and `BRANCH_LABELS`/`BRANCH_COLORS` in `src/pages/BrowsePage.tsx`.

---

## Local Development

**Requirements:** Node.js 18+ and npm.

```bash
npm install
npm run dev      # http://localhost:5173/perez-family-tree/
npm test         # run unit tests
npm run build    # production build → dist/
```

---

## How to Publish Updates

### Quick deploy (recommended)

```bash
# 1. Edit src/data/perez-family.json
# 2. Bump SEED_VERSION in src/store/familyTreeStore.ts
# 3. Build and deploy to gh-pages branch:
npm run deploy
```

`npm run deploy` runs `vite build && gh-pages -d dist`, pushing the compiled site to the `gh-pages` branch automatically.

### GitHub Pages setup (one-time)

1. Go to your repo on GitHub → **Settings → Pages**
2. Source: **Deploy from a branch** → Branch: `gh-pages` → Folder: `/ (root)` → **Save**
3. GitHub enables HTTPS automatically
4. Your site goes live at: `https://mrjuandrful.github.io/perez-family-tree/`

After first-time setup, just run `npm run deploy` for every future update.

---

## PWA — Install on Phone

### Android (Chrome)
1. Open the site in Chrome.
2. Tap the three-dot menu → **Add to Home screen**.

### iPhone / iPad (Safari)
1. Open the site in Safari.
2. Tap the **Share** button → **Add to Home Screen** → **Add**.

The app caches itself after the first visit and works offline. New versions are detected automatically on the next open.

### Generating PNG Icons (for full iOS install icon quality)

The SVG icon in `public/icons/icon.svg` works on Android PWA. For a custom icon on iOS, generate PNG files:

```bash
npm install --save-dev @resvg/resvg-js

node -e "
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const svg = fs.readFileSync('./public/icons/icon.svg');
for (const size of [192, 512]) {
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  fs.writeFileSync(\`./public/icons/icon-\${size}.png\`, r.render().asPng());
  console.log('Generated icon-' + size + '.png');
}
"
```

Commit the generated `.png` files and redeploy.

---

## Custom Domain

1. Copy `public/CNAME.example` to `public/CNAME` and set your domain:
   ```
   tree.perezfamily.com
   ```
2. Add a DNS `CNAME` record: `tree.perezfamily.com` → `mrjuandrful.github.io`
3. Update **four** places to use `/` instead of `/perez-family-tree/`:
   - `vite.config.ts`: `base: '/'`
   - `src/App.tsx` BrowserRouter: `basename="/"`
   - `public/manifest.json`: `"start_url": "/"` and `"scope": "/"`
   - `public/sw.js`: `const BASE = ''`
4. In GitHub → Settings → Pages → enable **Enforce HTTPS**
5. Redeploy: `npm run deploy`

---

## Updating the Service Worker Cache

When you deploy a new build, bump `CACHE_VERSION` in `public/sw.js`:

```js
const CACHE_VERSION = 'v4'; // was v3
```

Without this, some returning visitors may be served a stale cached version.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| State | Zustand + localStorage |
| Tree diagram | ReactFlow (@xyflow/react) |
| Search | Fuse.js |
| GEDCOM | parse-gedcom |
| i18n | i18next |
| Build | Vite |
| Deploy | GitHub Pages via gh-pages |
| PWA | Custom service worker + Web App Manifest |
