/**
 * Spatial arrow-key navigation for a masonry grid, where DOM order is column-major and
 * "down" means the next card below in the same column, not the next element in the DOM.
 * `rects` are bounding boxes in document order. Returns the new index (or `current` when nothing lies that way).
 */
export function nextIndex(rects, current, key) {
  if (rects.length === 0) return -1;
  if (key === 'Home') return 0;
  if (key === 'End') return rects.length - 1;
  const from = rects[current];
  if (!from) return 0;
  const cx = from.left + from.width / 2;
  const cy = from.top + from.height / 2;
  let best = current;
  let bestScore = Infinity;
  rects.forEach((rect, index) => {
    if (index === current) return;
    const dx = rect.left + rect.width / 2 - cx;
    const dy = rect.top + rect.height / 2 - cy;
    let along;
    let across;
    if (key === 'ArrowDown') [along, across] = [dy, dx];
    else if (key === 'ArrowUp') [along, across] = [-dy, dx];
    else if (key === 'ArrowRight') [along, across] = [dx, dy];
    else if (key === 'ArrowLeft') [along, across] = [-dx, dy];
    else return;
    if (along <= 1) return;
    // Up and down stay in the current column; only left and right may change column.
    if ((key === 'ArrowDown' || key === 'ArrowUp') && (rect.left >= from.left + from.width || rect.left + rect.width <= from.left)) return;
    // Prefer cards that stay in line with the current one over nearer cards in another column or row.
    const score = along + 3 * Math.abs(across);
    if (score < bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return best;
}

export const NAV_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
