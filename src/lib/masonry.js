/** Height-to-width ratios outside this range are cropped (object-fit: cover) so one panorama cannot dominate a column. */
export const MIN_RATIO = 0.5;
export const MAX_RATIO = 1.8;
export const FALLBACK_RATIO = 3 / 4;
/** The caption under each photo, in the same units as a ratio (about 72px on a 300px column). */
const CAPTION = 0.24;

/** Display ratio (height / width) of a photo. Picsum's list gives real dimensions, which lets the box be reserved before the image loads. */
export function ratioOf(photo) {
  if (!(photo.width > 0) || !(photo.height > 0)) return FALLBACK_RATIO;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, photo.height / photo.width));
}

export function columnCountFor(width) {
  if (width >= 1280) return 4;
  if (width >= 1024) return 3;
  if (width >= 640) return 2;
  return 1;
}

/**
 * Greedy shortest-column placement, using each photo's reserved height.
 * Photos already placed never move when more are appended, so loading the next page cannot shift the layout.
 * Returns one array of photo indexes per column.
 */
export function layoutColumns(photos, count) {
  const columns = Array.from({ length: count }, () => []);
  const heights = new Array(count).fill(0);
  photos.forEach((photo, index) => {
    let target = 0;
    for (let c = 1; c < count; c++) if (heights[c] < heights[target] - 1e-9) target = c;
    columns[target].push(index);
    heights[target] += ratioOf(photo) + CAPTION;
  });
  return columns;
}

export const picsumSrc = (id, width, ratio) =>
  `https://picsum.photos/id/${encodeURIComponent(id)}/${width}/${Math.round(width * ratio)}`;

/** The photo at its real aspect ratio (4:3 when unknown), long side capped at 1600 px. */
export function lightboxSize(photo, max = 1600) {
  const ratio = photo.width > 0 && photo.height > 0 ? photo.height / photo.width : 0.75;
  return ratio >= 1
    ? { width: Math.round(max / ratio), height: max }
    : { width: max, height: Math.round(max * ratio) };
}
