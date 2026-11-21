import { useCallback, useEffect, useState } from 'react';
import { buildSearch, parseUrlState } from '../lib/urlState';

/**
 * Search text and view mirrored in the query string. Typing replaces the history entry (no back-button spam);
 * switching view adds one, so Back returns to the previous view.
 */
export default function useUrlState() {
  const [state, setState] = useState(() => parseUrlState(window.location.search));

  useEffect(() => {
    const onPop = () => setState(parseUrlState(window.location.search));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const update = useCallback((patch, { push = false } = {}) => {
    setState(current => {
      const next = { ...current, ...patch };
      const url = `${window.location.pathname}${buildSearch(next)}${window.location.hash}`;
      if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
        window.history[push ? 'pushState' : 'replaceState'](null, '', url);
      }
      return next;
    });
  }, []);

  return [state, update];
}
