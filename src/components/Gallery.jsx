import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import useFetchPhotos from '../hooks/useFetchPhotos';
import useInfiniteScroll from '../hooks/useInfiniteScroll';
import { FAVOURITES_KEY, favouritesReducer, readFavourites } from '../state/favourites';
import Lightbox from './Lightbox';
import PhotoCard from './PhotoCard';

const retryButton = 'mt-3 cursor-pointer rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-800 hover:border-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-800';

export default function Gallery() {
  const { photos, loading, error, hasMore, loadMore, retry } = useFetchPhotos();
  const [search, setSearch] = useState('');
  const [favourites, dispatch] = useReducer(favouritesReducer, undefined, readFavourites);
  const [storageError, setStorageError] = useState(false);
  const searching = search.trim() !== '';
  // Picsum has no search endpoint, so auto-loading pauses while a search filters the loaded photos.
  const sentinelRef = useInfiniteScroll(loadMore, hasMore && !loading && !error && !searching);

  const handleSearch = useCallback(event => setSearch(event.target.value), []);
  const filteredPhotos = useMemo(() => {
    const query = search.trim().toLowerCase();
    return photos.filter(photo => photo.author.toLowerCase().includes(query));
  }, [photos, search]);

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

  function toggleFavourite(id) {
    const action = { type: 'toggle', id };
    dispatch(action);
    try {
      localStorage.setItem(FAVOURITES_KEY, JSON.stringify(favouritesReducer(favourites, action)));
      setStorageError(false);
    } catch {
      setStorageError(true);
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
        <p className="mt-4 max-w-xl text-base leading-7 text-stone-600">Explore a collection of photographs. Find a photographer you love, and keep your favourites close.</p>
        <div className="mb-8 mt-10 border-b border-stone-200 pb-7">
          <label htmlFor="author-search" className="mb-2 block text-sm font-medium text-stone-700">Search by photographer</label>
          <div className="relative max-w-md">
            <svg className="pointer-events-none absolute left-4 top-3.5 size-5 text-stone-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
            <input id="author-search" type="search" value={search} onChange={handleSearch} placeholder="Search an author’s name…" className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-12 pr-4 text-sm outline-none placeholder:text-stone-400 focus:border-emerald-800 focus:ring-2 focus:ring-emerald-800/15" />
          </div>
        </div>
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
              <p role="status">{filteredPhotos.length} {filteredPhotos.length === 1 ? 'photograph' : 'photographs'}{search.trim() ? ' found' : ' to explore'}</p>
              <span>Made to be remembered</span>
            </div>
            {filteredPhotos.length === 0 ? (
              <div className="py-20 text-center"><h2 className="font-serif text-2xl">No photographs found</h2><p className="mt-3 text-sm text-stone-500">Try a different author’s name.</p></div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {filteredPhotos.map(photo => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    favourite={favourites.includes(photo.id)}
                    onToggle={toggleFavourite}
                    onOpen={setOpenId}
                    thumbRef={element => registerThumb(photo.id, element)}
                  />
                ))}
              </div>
            )}
            <div className="mt-10 flex min-h-12 flex-col items-center justify-center gap-3 text-center text-sm text-stone-500">
              {loading ? (
                <p role="status" className="flex items-center gap-3">
                  <span aria-hidden="true" className="size-5 animate-spin rounded-full border-2 border-stone-200 border-t-emerald-800 motion-reduce:animate-none" />
                  Loading more photographs…
                </p>
              ) : error ? (
                <>
                  <p role="alert" className="text-red-800">{error}</p>
                  <button type="button" onClick={retry} className={retryButton}>Try again</button>
                </>
              ) : !hasMore ? (
                <p>You’ve reached the end of the collection.</p>
              ) : searching ? (
                <p>Showing matches from the {photos.length} photographs loaded so far. Clear the search to load more.</p>
              ) : (
                <button type="button" onClick={loadMore} className={retryButton}>Load more photographs</button>
              )}
            </div>
            {hasMore && <div ref={sentinelRef} aria-hidden="true" data-testid="scroll-sentinel" className="h-px" />}
          </>
        )}
        <footer className="mt-12 border-t border-stone-200 pt-6 text-xs text-stone-500">Photographs from Picsum. A collection of different perspectives.</footer>
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
