import { useCallback, useMemo, useReducer, useState } from 'react';
import useFetchPhotos from '../hooks/useFetchPhotos';
import { FAVOURITES_KEY, favouritesReducer, readFavourites } from '../state/favourites';
import PhotoCard from './PhotoCard';

export default function Gallery() {
  const { photos, loading, error } = useFetchPhotos();
  const [search, setSearch] = useState('');
  const [favourites, dispatch] = useReducer(favouritesReducer, undefined, readFavourites);
  const [storageError, setStorageError] = useState(false);

  const handleSearch = useCallback(event => setSearch(event.target.value), []);
  const filteredPhotos = useMemo(() => {
    const query = search.trim().toLowerCase();
    return photos.filter(photo => photo.author.toLowerCase().includes(query));
  }, [photos, search]);

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
    <div className="min-h-screen bg-[#faf9f6] font-sans text-stone-900 antialiased">
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
        {loading ? (
          <div role="status" className="flex min-h-64 flex-col items-center justify-center gap-4 text-sm text-stone-500">
            <span aria-hidden="true" className="size-8 animate-spin rounded-full border-2 border-stone-200 border-t-emerald-800 motion-reduce:animate-none" />
            Loading photographs…
          </div>
        ) : error ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">{error}</p>
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
                {filteredPhotos.map(photo => <PhotoCard key={photo.id} photo={photo} favourite={favourites.includes(photo.id)} onToggle={toggleFavourite} />)}
              </div>
            )}
          </>
        )}
        <footer className="mt-12 border-t border-stone-200 pt-6 text-xs text-stone-500">Photographs from Picsum. A collection of different perspectives.</footer>
      </main>
    </div>
  );
}
