export const FAVOURITES_KEY = 'celebrare-favourites';

export function readFavourites() {
  try {
    const saved = JSON.parse(localStorage.getItem(FAVOURITES_KEY));
    return Array.isArray(saved)
      ? [...new Set(saved.filter(id => typeof id === 'string'))]
      : [];
  } catch {
    return [];
  }
}

export function favouritesReducer(state, action) {
  switch (action.type) {
    case 'toggle':
      return state.includes(action.id)
        ? state.filter(id => id !== action.id)
        : [...state, action.id];
    case 'merge': {
      const known = new Set(state);
      return [...state, ...action.ids.filter(id => !known.has(id))];
    }
    default:
      return state;
  }
}

export function saveFavourites(ids) {
  localStorage.setItem(FAVOURITES_KEY, JSON.stringify(ids));
}
