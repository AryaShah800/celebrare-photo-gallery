import { useEffect, useRef, useState } from 'react';

/**
 * Calls `onReach` when the returned ref's element scrolls near the viewport.
 * The observer is rebuilt whenever `enabled` turns back on, so a marker that is
 * still visible after a page loads triggers the next page straight away.
 */
export default function useInfiniteScroll(onReach, enabled, rootMargin = '400px 0px') {
  const [node, setNode] = useState(null);
  const onReachRef = useRef(onReach);

  useEffect(() => {
    onReachRef.current = onReach;
  }, [onReach]);

  useEffect(() => {
    if (!node || !enabled || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) onReachRef.current();
    }, { rootMargin });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, enabled, rootMargin]);

  return setNode;
}
