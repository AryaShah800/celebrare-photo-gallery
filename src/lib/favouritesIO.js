const APP = 'celebrare-photo-gallery';
const ID = /^\d{1,6}$/;
export const MAX_IMPORT = 2000;

export function exportFavourites(ids, now = new Date()) {
  return JSON.stringify({ app: APP, version: 1, exportedAt: now.toISOString(), favourites: ids }, null, 2);
}

/** Accepts an export file or a bare array of ids. Throws an Error whose message is safe to show to the user. */
export function parseFavouritesFile(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const list = Array.isArray(data) ? data : data && data.app === APP ? data.favourites : null;
  if (!Array.isArray(list)) throw new Error('That file is not a Celebrare favourites export.');
  if (list.length > MAX_IMPORT) throw new Error(`That file lists more than ${MAX_IMPORT} photographs.`);
  const ids = [...new Set(list.map(String))].filter(id => ID.test(id));
  if (ids.length === 0 && list.length > 0) throw new Error('None of the photograph ids in that file are valid.');
  return ids;
}

export function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('That file could not be read.'));
    reader.readAsText(file);
  });
}
