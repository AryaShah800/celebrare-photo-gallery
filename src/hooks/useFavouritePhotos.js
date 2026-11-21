import { useEffect, useMemo, useState } from 'react';

const infoUrl = id => `https://picsum.photos/id/${encodeURIComponent(id)}/info`;

/**
 * Photo records for the saved ids, in saved order. Ids already loaded in the gallery are reused;
 * the rest are fetched from Picsum's per-photo info endpoint (so a shared favourites link works on a fresh visit).
 */
export default function useFavouritePhotos(ids, loadedPhotos, enabled) {
  const [fetched, setFetched] = useState({});
  const loadedById = useMemo(() => new Map(loadedPhotos.map(photo => [photo.id, photo])), [loadedPhotos]);

  useEffect(() => {
    if (!enabled) return;
    const missing = ids.filter(id => !loadedById.has(id) && !(id in fetched));
    if (missing.length === 0) return;
    const controller = new AbortController();
    Promise.all(missing.map(async id => {
      try {
        const response = await fetch(infoUrl(id), { signal: controller.signal });
        if (!response.ok) throw new Error('info failed');
        const data = await response.json();
        if (typeof data.author !== 'string') throw new Error('bad info');
        return [id, { id, author: data.author, width: data.width, height: data.height }];
      } catch {
        // A missing photo still shows, so it can be un-favourited.
        return [id, { id, author: 'Unknown photographer', width: 0, height: 0, unavailable: true }];
      }
    })).then(entries => {
      if (!controller.signal.aborted) setFetched(current => ({ ...current, ...Object.fromEntries(entries) }));
    });
    return () => controller.abort();
  }, [ids, loadedById, enabled, fetched]);

  return useMemo(() => {
    const photos = ids.map(id => loadedById.get(id) ?? fetched[id]).filter(Boolean);
    return { photos, pending: ids.length - photos.length };
  }, [ids, loadedById, fetched]);
}
