# Celebrare Photo Gallery

A responsive photo gallery built with React, Vite, and Tailwind CSS for the Celebrare frontend internship assignment. It loads photos from Picsum page by page as you scroll, filters them by author, opens them in an accessible lightbox, and saves favourites in the browser.

[![Deploy](https://github.com/AryaShah800/celebrare-photo-gallery/actions/workflows/deploy.yml/badge.svg)](https://github.com/AryaShah800/celebrare-photo-gallery/actions/workflows/deploy.yml)

**[View the live demo](https://aryashah800.github.io/celebrare-photo-gallery/)**

## Features

- **Masonry with no layout shift.** Picsum's list gives every photo's real width and height, so each card reserves its box (`aspect-ratio`) before the image arrives. Columns (1, 2, 3 or 4 by viewport width) are filled shortest-first, which means photos already placed never move when the next page is appended. Extreme panoramas and portraits are cropped to a 0.5 to 1.8 height/width range so one photo cannot dominate a column.
- **Blur-up.** A 24 px version of each photo, blurred, shows until the full image fades in. Full images use `srcset` (400, 640 and 960 px wide) with matching `sizes`, so phones do not download desktop-size photos.
- **Keyboard navigation.** The grid is one tab stop. Arrow keys move to the card above, below, left or right by its real position (not DOM order), Home and End jump to the first and last, Enter opens the lightbox, and F toggles the favourite. Opening the lightbox traps focus, Esc closes it and focus returns to the photo that was showing. Infinite loading still works for keyboard users, and a visually hidden Load more button appears on focus.
- **Shareable URL.** Search and view are in the query string (`?q=ada&view=favourites`). Typing replaces the history entry; switching view adds one, so Back works. A shared link opens on the same view.
- **Favourites collection.** A Favourites view lists saved photos in saved order, fetching the ones not yet loaded from Picsum's per-photo info endpoint. **Export JSON** downloads `celebrare-favourites.json`; **Import JSON** validates the file (ids must be 1 to 6 digits, at most 2,000, a bare array also works) and merges it, reporting how many were new.
- **Works offline.** A hand-written service worker (`public/sw.js`) precaches the built app shell on install, keeps the newest 300 photos it has displayed, and serves the last good photo list when the network is gone. An offline banner explains what you are seeing. Photos you never viewed are not available offline.
- Infinite scroll: 30 photos per page with an `IntersectionObserver`, a retry for failed pages and an end-of-collection message
- Live, case-insensitive search by author (auto-loading pauses while a search is active, because Picsum has no search endpoint)
- Favourites persist across reloads (`useReducer` + `localStorage`)
- Vitest + React Testing Library unit tests, Playwright end-to-end tests, ESLint (`react-hooks`, `jsx-a11y`) and a CI workflow that runs lint, test and build on every pull request

## Run locally

Use Node.js 22.12 or later.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. To run the checks and build a production version:

```sh
npm run lint
npm test
npm run build
```

## How it meets the assignment brief

| Requirement | Implementation |
| --- | --- |
| React + Vite + Tailwind CSS | Vite configuration, React components, and Tailwind styles |
| Fetch Picsum photos with loading and error states | `src/hooks/useFetchPhotos.js` (30 per page) |
| Responsive photo cards | `src/components/PhotoCard.jsx` and the grid in `Gallery.jsx` |
| Live author search without another API request | `src/components/Gallery.jsx` |
| Favourites with `useReducer` and `localStorage` | `src/state/favourites.js` and `Gallery.jsx` |
| Custom `useFetchPhotos` hook | Returns `photos`, `loading`, and `error` |
| `useCallback` and `useMemo` | Search handler and filtered photo list in `Gallery.jsx` |

The grid shows one column on mobile, two from 768px, and four from 1024px. Search is case-insensitive and ignores spaces around the query. Favourite IDs are restored from `localStorage` on the first render and saved after changes.

The fetch hook checks the HTTP response and photo data, displays an error if either fails, and aborts the request when the component unmounts. The tests cover loading, errors, search, favourites, and storage edge cases.

## Beyond the brief

| Feature | Implementation |
| --- | --- |
| Masonry and reserved aspect ratio | `src/lib/masonry.js`, `src/components/PhotoCard.jsx` |
| Blur-up and responsive images | `src/components/PhotoCard.jsx` |
| Spatial arrow-key navigation | `src/lib/gridNav.js`, roving tabindex in `Gallery.jsx` |
| URL-synced search and view | `src/lib/urlState.js`, `src/hooks/useUrlState.js` |
| Favourites view, export and import | `src/hooks/useFavouritePhotos.js`, `src/lib/favouritesIO.js` |
| Offline support | `public/sw.js`, registered in `src/main.jsx` (production builds only) |
| Infinite scroll | `src/hooks/useInfiniteScroll.js` and paging in `useFetchPhotos.js` |
| Accessible lightbox | `src/components/Lightbox.jsx` |

## Measured

All numbers are from 21 Nov 2026 on one Windows laptop (Edge, headless), comparing the **production build** of this branch with the previous `main`, both served locally by `vite preview`. Photos come from the live Picsum service, so absolute timings depend on the network and vary run to run; treat Lighthouse as indicative and CLS as the more reliable number.

**Layout shift (CLS).** A `PerformanceObserver` for `layout-shift` entries, scrolling down 30 times by 700 px with 250 ms pauses so several pages load (same script on both builds; shifts within 500 ms of input are excluded, as Chrome does):

| | Before (previous main) | After |
| --- | --- | --- |
| Desktop 1280x800 | 0.2734 | 0.0000 |
| Mobile 390x844 | 0.0644 | 0.0000 |

Nothing visible sits below the grid while pages load: the loading indicator is fixed to the viewport, there is no footer, and the idle Load more button takes no space until it is focused. `e2e/gallery.spec.js` asserts CLS stays under 0.01 across three pages.

**Lighthouse 12.** `npx lighthouse@12` with the default settings (mobile emulation and throttling) and with `--preset=desktop`:

Median of 3 runs, each run in parentheses.

| Preset | Metric | Before | After |
| --- | --- | --- | --- |
| mobile | Performance score | 95 (95, 95, 96) | 94 (95, 94, 94) |
| mobile | Accessibility score | 100 (100, 100, 100) | 100 (100, 100, 100) |
| mobile | First Contentful Paint (s) | 1.3 (1.3, 1.2, 1.3) | 1.4 (1.4, 1.4, 1.4) |
| mobile | Largest Contentful Paint (s) | 2.8 (2.8, 2.9, 2.8) | 2.8 (2.8, 3.0, 2.8) |
| mobile | Total Blocking Time (ms) | 7 (28, 7, 0) | 79 (79, 73, 149) |
| mobile | Cumulative Layout Shift | 0.000 (0.000, 0.000, 0.000) | 0.000 (0.000, 0.000, 0.000) |
| desktop | Performance score | 72 (59, 72, 74) | 91 (91, 90, 95) |
| desktop | Accessibility score | 100 (100, 100, 100) | 100 (100, 100, 100) |
| desktop | First Contentful Paint (s) | 0.3 (0.3, 0.3, 0.3) | 0.3 (0.3, 0.3, 0.3) |
| desktop | Largest Contentful Paint (s) | 1.4 (3.0, 1.4, 1.0) | 2.0 (2.0, 2.0, 1.5) |
| desktop | Total Blocking Time (ms) | 0 (0, 0, 0) | 0 (16, 0, 0) |
| desktop | Cumulative Layout Shift | 0.963 (0.963, 0.963, 0.963) | 0.005 (0.005, 0.005, 0.005) |

What the table says: the layout-shift problem is fixed (desktop CLS 0.963 to 0.005, which lifts the desktop performance score from 72 to 91). It does not make the page faster everywhere. Desktop LCP is slower (median 2.0 s against 1.4 s; the largest image now fades in from a blurred placeholder and is requested at a cropped size through a srcset), and mobile Total Blocking Time rose from 7 ms to 79 ms (more JavaScript: masonry layout, URL state, service worker registration). Mobile score and LCP are otherwise level. Mobile CLS was already 0 on first load for both builds; the scroll test above is where the old version shifted.

Both columns are production builds served by `vite preview` on localhost, so server and network path are identical. Reproduce with `npm run build && npm run preview`, then `npx lighthouse http://127.0.0.1:4173/celebrare-photo-gallery/`.

**Not done, and why.** The grid is not virtualized: it renders every loaded photo (the DOM holds about 300 cards after scrolling through ten pages), and `loading="lazy"` keeps off-screen images from being fetched. Virtualizing a masonry layout means measuring or estimating every card's offset and would trade the stable, append-only layout for complexity; at Picsum's roughly 1,000 photos it was not needed. There are no PNG icons, so browsers may not offer an install prompt; offline caching works without one.

## Tests

```sh
npm run lint
npm test          # 47 Vitest tests
npm run test:e2e  # Playwright; needs a network connection (real Picsum). PW_CHANNEL=msedge uses an installed Edge
```

The Playwright suite checks CLS across three pages, arrow-key and lightbox focus behaviour, URL round trips, favourites export and import between two browser profiles, and reloading offline from the service worker's caches. It is not part of CI because it depends on the Picsum service.

## License

MIT. See [LICENSE](LICENSE). Photos are served by [Picsum](https://picsum.photos/).
