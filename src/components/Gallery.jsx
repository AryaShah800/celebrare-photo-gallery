import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import useFetchPhotos from '../hooks/useFetchPhotos';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import useColumns from '../hooks/useColumns';
import useFavouritePhotos from '../hooks/useFavouritePhotos';
import useOnline from '../hooks/useOnline';
import useUrlState from '../hooks/useUrlState';
import { NAV_KEYS, nextIndex } from '../lib/gridNav';
import { exportFavourites, parseFavouritesFile, readFileText } from '../lib/favouritesIO';
import { layoutColumns } from '../lib/masonry';
import { favouritesReducer, readFavourites, saveFavourites } from '../state/favourites';
import Lightbox from './Lightbox';
import PhotoCard from './PhotoCard';

const toolbarButton = 'cursor-pointer rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:border-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 aria-pressed:border-emerald-900 aria-pressed:bg-emerald-900 aria-pressed:text-white';
const retryButton = 'mt-3 cursor-pointer rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-800 hover:border-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-800';

export default function Gallery() {
  const { photos, loading, error, hasMore, loadMore, retry } = useFetchPhotos();
  const [{ q: search, view }, updateUrl] = useUrlState();
  const [favourites, dispatch] = useReducer(favouritesReducer, undefined, readFavourites);
  const [storageError, setStorageError] = useState(false);
  const [notice, setNotice] = useState('');
  const fileInput = useRef(null);
  const online = useOnline();
  const columnCount = useColumns();
  const showingFavourites = view === 'favourites';
  const searching = search.trim() !== '';
  // Picsum has no search endpoint, so auto-loading pauses while a search filters the loaded photos.
  const sentinelRef = useInfiniteScroll(loadMore, hasMore && !loading && !error && !searching && !showingFavourites);

  const handleSearch = useCallback(event => updateUrl({ q: event.target.value }), [updateUrl]);
  const { photos: favouritePhotos, pending: favouritesPending } = useFavouritePhotos(favourites, photos, showingFavourites);
  const source = showingFavourites ? favouritePhotos : photos;
  const filteredPhotos = useMemo(() => {
    const query = search.trim().toLowerCase();
    return source.filter(photo => photo.author.toLowerCase().includes(query));
  }, [source, search]);
  const columns = useMemo(() => layoutColumns(filteredPhotos, columnCount), [filteredPhotos, columnCount]);

  // Roving tabindex: one card in the grid is a tab stop, arrow keys move between cards.
  const [focusId, setFocusId] = useState(null);
  const activeId = filteredPhotos.some(photo => photo.id === focusId) ? focusId : filteredPhotos[0]?.id;

  const [openId, setOpenId] = useState(null);
  const thumbs = useRef(new Map());
  const returnFocusTo = useRef(null);
  const openIndex = openId === null ? -1 : filteredPhotos.findIndex(photo => photo.id === openId);

  // Runs after the page is no longer inert, so the thumbnail can take focus again.
  useEffect(() => {
    if (openId !== null || returnFocusTo.current === null) return;
    thumbs.current.get(returnFocusTo.current)?.focus();
    returnFocusTo.current = null;
  }, [openId]);

  function closeLightbox() {
    returnFocusTo.current = openId;
    setOpenId(null);
  }

  function registerThumb(id, element) {
    if (element) thumbs.current.set(id, element);
    else thumbs.current.delete(id);
  }

  function applyFavourites(action) {
    dispatch(action);
    try {
      saveFavourites(favouritesReducer(favourites, action));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }

  const toggleFavourite = id => applyFavourites({ type: 'toggle', id });

  function handleGridKeyDown(event) {
    const id = event.target.dataset?.photoId;
    if (id === undefined || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'f' || event.key === 'F') {
      event.preventDefault();
      toggleFavourite(id);
      return;
    }
    if (!NAV_KEYS.includes(event.key)) return;
    event.preventDefault();
    const current = filteredPhotos.findIndex(photo => photo.id === id);
    const rects = filteredPhotos.map(photo => thumbs.current.get(photo.id)?.getBoundingClientRect() ?? { left: 0, top: 0, width: 0, height: 0 });
    const next = nextIndex(rects, current, event.key);
    if (next >= 0 && next !== current) thumbs.current.get(filteredPhotos[next].id)?.focus();
  }

  // A native listener, because the grid itself is a plain container; the focusable thumbnails inside it are the interactive elements.
  const [gridNode, setGridNode] = useState(null);
  const gridKeys = useRef(handleGridKeyDown);
  useEffect(() => {
    gridKeys.current = handleGridKeyDown;
  });
  useEffect(() => {
    if (!gridNode) return;
    const listener = event => gridKeys.current(event);
    gridNode.addEventListener('keydown', listener);
    return () => gridNode.removeEventListener('keydown', listener);
  }, [gridNode]);

  function downloadFavourites() {
    const blob = new Blob([exportFavourites(favourites)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'celebrare-favourites.json';
    link.click();
    URL.revokeObjectURL(url);
    setNotice(`Exported ${favourites.length} ${favourites.length === 1 ? 'favourite' : 'favourites'}.`);
  }

  async function importFavourites(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const ids = parseFavouritesFile(await readFileText(file));
      const added = ids.filter(id => !favourites.includes(id)).length;
      applyFavourites({ type: 'merge', ids });
      setNotice(`Imported ${ids.length} ${ids.length === 1 ? 'photograph' : 'photographs'}, ${added} new.`);
    } catch (problem) {
      setNotice(problem.message);
    }
  }

  return (
    <>
    <div inert={openIndex !== -1} className="min-h-screen bg-[#faf9f6] font-sans text-stone-900 antialiased">
      <header className="border-b border-stone-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 sm:px-8">
          <span className="font-serif text-2xl font-semibold tracking-tight text-emerald-950">celebrare<span className="text-emerald-600">.</span></span>
          <span className="text-xs uppercase tracking-[0.2em] text-stone-500">Photo gallery</span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 pb-16 pt-12 sm:px-8 sm:pt-16">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-800">A little inspiration, every day</p>
        <h1 className="font-serif text-4xl leading-tight tracking-tight sm:text-6xl">Moments worth keeping.</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-stone-600">Explore a collection of photographs. Find a photographer you love, and keep your favourites close. Photographs from Picsum.</p>
        <div className="mb-8 mt-10 border-b border-stone-200 pb-7">
          <label htmlFor="author-search" className="mb-2 block text-sm font-medium text-stone-700">Search by photographer</label>
          <div className="relative max-w-md">
            <svg className="pointer-events-none absolute left-4 top-3.5 size-5 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
            <input id="author-search" type="search" value={search} onChange={handleSearch} placeholder="Search an author’s name…" className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-12 pr-4 text-sm outline-none placeholder:text-stone-400 focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/15" />
          </div>
        </div>
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <button type="button" aria-pressed={!showingFavourites} onClick={() => updateUrl({ view: 'all' }, { push: true })} className={toolbarButton}>All photographs</button>
          <button type="button" aria-pressed={showingFavourites} onClick={() => updateUrl({ view: 'favourites' }, { push: true })} className={toolbarButton}>Favourites ({favourites.length})</button>
          {showingFavourites && (
            <>
              <span className="mx-1 hidden h-6 w-px bg-stone-300 sm:block" aria-hidden="true" />
              <button type="button" onClick={downloadFavourites} disabled={favourites.length === 0} className={`${toolbarButton} disabled:cursor-not-allowed disabled:opacity-50`}>Export JSON</button>
              <button type="button" onClick={() => fileInput.current?.click()} className={toolbarButton}>Import JSON</button>
              <input ref={fileInput} type="file" accept="application/json,.json" onChange={importFavourites} className="sr-only" tabIndex={-1} aria-label="Import favourites file" />
            </>
          )}
        </div>
        <p className="-mt-4 mb-6 text-xs text-stone-500">Keyboard: arrow keys move between photographs, Enter opens one and F saves it.</p>
        {notice && <p role="status" className="mb-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">{notice}</p>}
        {!online && <p role="status" className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">You are offline. Photographs you have already viewed are still available.</p>}
        {storageError && <p role="alert" className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Your browser couldn’t save favourites. They will only last until you refresh.</p>}
        {photos.length === 0 && loading ? (
          <div role="status" className="flex min-h-64 flex-col items-center justify-center gap-4 text-sm text-stone-500">
            <span aria-hidden="true" className="size-8 animate-spin rounded-full border-2 border-stone-200 border-t-emerald-800 motion-reduce:animate-none" />
            Loading photographs…
          </div>
        ) : photos.length === 0 && error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
            <p role="alert">{error}</p>
            <button type="button" onClick={retry} className={retryButton}>Try again</button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between text-xs text-stone-500">
              <p role="status">{filteredPhotos.length} {filteredPhotos.length === 1 ? 'photograph' : 'photographs'}{search.trim() ? ' found' : showingFavourites ? ' saved' : ' to explore'}</p>
              <span>Made to be remembered</span>
            </div>
            {filteredPhotos.length === 0 ? (
              <div className="py-20 text-center">
                <h2 className="font-serif text-2xl">{showingFavourites && !searching && favouritesPending === 0 ? 'No favourites yet' : 'No photographs found'}</h2>
                <p className="mt-3 text-sm text-stone-500">{showingFavourites && !searching ? 'Press the heart on a photograph, or import a file.' : 'Try a different author’s name.'}</p>
              </div>
            ) : (
              // Columns are filled shortest-first from each photo's real aspect ratio, so appended pages never move existing photos.
              <div className="flex items-start gap-6" ref={setGridNode} data-testid="masonry">
                {columns.map((column, c) => (
                  <div key={c} className="flex min-w-0 flex-1 flex-col gap-6">
                    {column.map(index => {
                      const photo = filteredPhotos[index];
                      return (
                        <PhotoCard
                          key={photo.id}
                          photo={photo}
                          favourite={favourites.includes(photo.id)}
                          active={photo.id === activeId}
                          eager={index < 4}
                          onToggle={toggleFavourite}
                          onOpen={setOpenId}
                          onFocusThumb={setFocusId}
                          thumbRef={element => registerThumb(photo.id, element)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-col items-center justify-center gap-3 text-center text-sm text-stone-500">
              {loading ? (
                // Fixed to the viewport, not in the page flow: a visible in-flow loader would be pushed down by every new page (a layout shift).
                <p role="status" className="fixed bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm text-stone-600 shadow-lg">
                  <span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-stone-200 border-t-emerald-800 motion-reduce:animate-none" />
                  Loading more photographs…
                </p>
              ) : error ? (
                <>
                  <p role="alert" className="mt-10 text-red-800">{error}</p>
                  <button type="button" onClick={retry} className={retryButton}>Try again</button>
                </>
              ) : showingFavourites ? (
                favouritesPending > 0 ? <p role="status" className="mt-10">Loading your favourites…</p> : null
              ) : !hasMore ? (
                <p className="mt-10">You’ve reached the end of the collection.</p>
              ) : searching ? (
                <p className="mt-10">Showing matches from the {photos.length} photographs loaded so far. Clear the search to load more.</p>
              ) : (
                <button type="button" onClick={loadMore} className={`${retryButton} ${typeof IntersectionObserver === 'undefined' ? '' : 'sr-only focus:not-sr-only'}`}>Load more photographs</button>
              )}
            </div>
            {hasMore && !showingFavourites && <div ref={sentinelRef} aria-hidden="true" data-testid="scroll-sentinel" className="h-px" />}
          </>
        )}
      </main>
    </div>
    {openIndex !== -1 && (
      <Lightbox
        photo={filteredPhotos[openIndex]}
        index={openIndex}
        total={filteredPhotos.length}
        onClose={closeLightbox}
        onPrevious={() => setOpenId(filteredPhotos[openIndex - 1].id)}
        onNext={() => setOpenId(filteredPhotos[openIndex + 1].id)}
      />
    )}
    </>
  );
}
