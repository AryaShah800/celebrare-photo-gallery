# Celebrare Photo Gallery

A responsive photo gallery built with React, Vite, and Tailwind CSS for the Celebrare frontend internship assignment. It loads 30 photos from Picsum, filters them by author, and saves favourites in the browser.

[![Deploy](https://github.com/AryaShah800/celebrare-photo-gallery/actions/workflows/deploy.yml/badge.svg)](https://github.com/AryaShah800/celebrare-photo-gallery/actions/workflows/deploy.yml)

**[View the live demo](https://aryashah800.github.io/celebrare-photo-gallery/)**

## Features

- Loads 30 photos from Picsum with loading and error states
- Live, case-insensitive search by author
- Favourites that persist across reloads (`useReducer` + `localStorage`)
- Responsive grid: 1 column on mobile, 2 from 768px, 4 from 1024px
- Unit tests for fetching, search and favourite persistence

## Run locally

Use Node.js 22.12 or later.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. To run the checks and build a production version:

```sh
npm test
npm run build
```

## How it meets the assignment brief

| Requirement | Implementation |
| --- | --- |
| React + Vite + Tailwind CSS | Vite configuration, React components, and Tailwind styles |
| Fetch 30 Picsum photos with loading and error states | `src/hooks/useFetchPhotos.js` |
| Responsive photo cards | `src/components/PhotoCard.jsx` and the grid in `Gallery.jsx` |
| Live author search without another API request | `src/components/Gallery.jsx` |
| Favourites with `useReducer` and `localStorage` | `src/state/favourites.js` and `Gallery.jsx` |
| Custom `useFetchPhotos` hook | Returns `photos`, `loading`, and `error` |
| `useCallback` and `useMemo` | Search handler and filtered photo list in `Gallery.jsx` |

The grid shows one column on mobile, two from 768px, and four from 1024px. Search is case-insensitive and ignores spaces around the query. Favourite IDs are restored from `localStorage` on the first render and saved after changes.

The fetch hook checks the HTTP response and photo data, displays an error if either fails, and aborts the request when the component unmounts. The tests cover loading, errors, search, favourites, and storage edge cases.

## License

MIT. See [LICENSE](LICENSE). Photos are served by [Picsum](https://picsum.photos/).
