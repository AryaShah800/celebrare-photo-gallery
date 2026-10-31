import { useEffect, useState } from 'react';

export default function useFetchPhotos() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchPhotos() {
      try {
        const response = await fetch('https://picsum.photos/v2/list?limit=30', {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Photo request failed');
        const data = await response.json();
        if (!Array.isArray(data) || !data.every(photo =>
          typeof photo.id === 'string' && typeof photo.author === 'string'
        )) throw new Error('Unexpected photo data');
        if (!controller.signal.aborted) setPhotos(data);
      } catch {
        if (!controller.signal.aborted) {
          setError('We couldn’t load the photos. Check your connection and refresh the page.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchPhotos();
    return () => controller.abort();
  }, []);

  return { photos, loading, error };
}
