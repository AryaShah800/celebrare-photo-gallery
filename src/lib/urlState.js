export const VIEWS = ['all', 'favourites'];

/** Search text and view live in the URL (`?q=ada&view=favourites`) so a filtered gallery can be shared. */
export function parseUrlState(search) {
  const params = new URLSearchParams(search);
  const view = params.get('view');
  return { q: (params.get('q') ?? '').slice(0, 100), view: VIEWS.includes(view) ? view : 'all' };
}

export function buildSearch({ q, view }) {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  if (view !== 'all') params.set('view', view);
  const text = params.toString();
  return text ? `?${text}` : '';
}
