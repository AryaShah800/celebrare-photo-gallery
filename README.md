# Celebrare Photo Gallery

A focused React internship assignment: 30 Picsum photographs, live author search, and persistent favourites. Built from scratch with functional React components, Vite and Tailwind CSS. No UI component library.

## Run

Use Node.js 22.12+ (tested with 22.20.0).

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

## Requirement map

| Requirement | Implementation |
| --- | --- |
| React + Vite + Tailwind | package.json, vite.config.js, src/index.css |
| Fetch 30 photos, loading and error | src/hooks/useFetchPhotos.js |
| Responsive cards | src/components/PhotoCard.jsx; Gallery grid: mobile 1, tablet 2 at 768px, desktop 4 at 1024px |
| Real-time author search, no search request | src/components/Gallery.jsx |
| useReducer + localStorage | src/state/favourites.js and Gallery.jsx |
| Custom hook returns photos, loading, error | src/hooks/useFetchPhotos.js |
| useCallback + useMemo | handleSearch and filteredPhotos in Gallery.jsx |

The hook checks HTTP status, validates the response, and aborts on unmount. Image URLs use the returned photo IDs at 640 x 480 to avoid downloading full-resolution originals. An author search is case-insensitive and ignores surrounding whitespace.

Favourites are stored as IDs under `celebrare-favourites`. The reducer handles one `toggle` action and returns a new array. The lazy initialiser restores saved IDs before the first render; the effect writes subsequent state. Invalid saved data falls back to an empty list. If browser storage is blocked, favourites work for the current session and a message explains the persistence limitation.

`useCallback` preserves the search handler's reference between renders. In this small app the native input does not need that optimisation; it is included as required. `useMemo` avoids repeating filtering when only favourites change. Removing either optimisation would not break correctness. The callback depends on React's stable state setter; memoised filtering depends on photos and search.

Tests cover loading, local search without additional fetches, empty results, restored and removed favourites, network/HTTP/malformed-response failures, invalid storage and blocked storage.

## Five-minute recording guide

- **0:00–1:00:** Show the app loading photos, search an author, clear search, toggle a heart, refresh and show that it stays selected. Resize to show 1 / 2 / 4 columns.
- **1:00–2:00:** Open useFetchPhotos.js. Explain its three returned values, the effect, HTTP check, catch/finally, and abort cleanup. Demonstrate an API error using browser devtools offline mode and refresh; restore the network afterwards.
- **2:00–3:00:** Open favourites.js and the reducer/effect in Gallery.jsx. Explain the toggle action, immutable updates, lazy storage initialisation, and saving changes. useReducer is required here and centralises state transitions.
- **3:00–4:00:** Explain handleSearch and filteredPhotos. Be honest: these hooks optimise reference stability and derived calculations; the app still works without them.
- **4:00–5:00:** Describe a difficulty you actually encountered and understood. A useful topic to study is restoring favourites before the persistence effect runs, so saved values are not overwritten with an initial empty array. Do not present someone else's experience as your own.

Read and understand every source file before recording. The assignment permits AI tools but requires you to explain every line.

## Submission checklist (applicant steps)

- Push this project, including package-lock.json and excluding node_modules/dist, to a public GitHub repository.
- Record yourself explaining and demonstrating the app (mandatory).
- Upload the recording to Google Drive with view access, or YouTube unlisted. Check both links while signed out.
- Submit the GitHub URL, recording URL, and an honest one-line description of the hardest part through https://forms.gle/fBdouZ18ZnUEtxjdA.
- The covering document specifies 1 November 2026 at 8 pm, without a timezone. The prescreening specifies within 24 hours of receipt; ensure you meet the applicable deadline.

Repository: https://github.com/AryaShah800/celebrare-photo-gallery. The recording and form submission remain applicant steps.

## References

- https://vite.dev/guide/
- https://tailwindcss.com/docs/installation/using-vite
- https://picsum.photos/
