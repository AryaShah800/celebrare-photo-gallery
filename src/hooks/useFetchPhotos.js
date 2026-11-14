import { useCallback, useEffect, useRef, useState } from 'react';

export const PAGE_SIZE = 30;
export const photosUrl = page => `https://picsum.photos/v2/list?page=${page}&limit=${PAGE_SIZE}`;

function isPhotoList(data) {
  return Array.isArray(data) && data.every(photo =>
    typeof photo.id === 'string' && typeof photo.author === 'string'
  );
}

export default function useFetchPhotos() {
  const [photos, setPhotos] = useState([]);
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  // Blocks a second request starting before React re-renders with loading = true.
  const busy = useRef(true);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchPage() {
      try {
        const response = await fetch(photosUrl(page), { signal: controller.signal });
        if (!response.ok) throw new Error('Photo request failed');
        const data = await response.json();
        if (!isPhotoList(data)) throw new Error('Unexpected photo data');
        if (controller.signal.aborted) return;
        setPhotos(current => {
          const seen = new Set(current.map(photo => photo.id));
          return [...current, ...data.filter(photo => !seen.has(photo.id))];
        });
        setHasMore(data.length === PAGE_SIZE);
      } catch {
        if (!controller.signal.aborted) {
          setError(page === 1
            ? 'We couldn’t load the photos. Check your connection and refresh the page.'
            : 'We couldn’t load more photos. Check your connection and try again.');
        }
      } finally {
        if (!controller.signal.aborted) {
          busy.current = false;
          setLoading(false);
        }
      }
    }

    fetchPage();
    return () => controller.abort();
  }, [page, attempt]);

  const loadMore = useCallback(() => {
    if (busy.current || !hasMore || error) return;
    busy.current = true;
    setLoading(true);
    setPage(current => current + 1);
  }, [hasMore, error]);

  const retry = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    setLoading(true);
    setAttempt(current => current + 1);
  }, []);

  return { photos, loading, error, hasMore, loadMore, retry };
}
