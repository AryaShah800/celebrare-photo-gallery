import { describe, expect, it } from 'vitest';
import { FALLBACK_RATIO, MAX_RATIO, MIN_RATIO, columnCountFor, layoutColumns, picsumSrc, ratioOf } from '../src/lib/masonry';
import { nextIndex } from '../src/lib/gridNav';
import { buildSearch, parseUrlState } from '../src/lib/urlState';
import { exportFavourites, parseFavouritesFile } from '../src/lib/favouritesIO';

const photo = (id, width, height) => ({ id: String(id), author: 'A', width, height });

describe('masonry', () => {
  it('reserves height from real dimensions, clamps extremes and falls back when they are missing', () => {
    expect(ratioOf(photo(1, 2000, 1000))).toBe(MIN_RATIO);
    expect(ratioOf(photo(2, 1000, 1500))).toBe(1.5);
    expect(ratioOf(photo(3, 100, 900))).toBe(MAX_RATIO);
    expect(ratioOf({ id: '4', author: 'A' })).toBe(FALLBACK_RATIO);
    expect(ratioOf(photo(5, 0, 10))).toBe(FALLBACK_RATIO);
  });

  it('picks the column count from the viewport width', () => {
    expect([320, 640, 1024, 1280].map(columnCountFor)).toEqual([1, 2, 3, 4]);
  });

  it('keeps already placed photos in the same column when more are appended (no layout shift)', () => {
    const photos = Array.from({ length: 60 }, (_, i) => photo(i, 1000, 500 + ((i * 137) % 900)));
    const first = layoutColumns(photos.slice(0, 30), 4);
    const all = layoutColumns(photos, 4);
    first.forEach((column, c) => expect(all[c].slice(0, column.length)).toEqual(column));
    expect(all.flat().sort((a, b) => a - b)).toEqual(photos.map((_, i) => i));
  });

  it('balances column heights', () => {
    const photos = Array.from({ length: 80 }, (_, i) => photo(i, 1000, 600 + ((i * 53) % 700)));
    const heights = layoutColumns(photos, 4).map(column => column.reduce((sum, i) => sum + ratioOf(photos[i]) + 0.24, 0));
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(2);
  });

  it('builds Picsum URLs with the cropped aspect ratio', () => {
    expect(picsumSrc('10', 640, 0.75)).toBe('https://picsum.photos/id/10/640/480');
  });
});

describe('grid navigation', () => {
  // Column A: 0 (top), 1 (below). Column B: 2 (top), 3 (below), 4 (bottom).
  const rects = [
    { left: 0, top: 0, width: 100, height: 100 },
    { left: 0, top: 110, width: 100, height: 150 },
    { left: 110, top: 0, width: 100, height: 60 },
    { left: 110, top: 70, width: 100, height: 100 },
    { left: 110, top: 180, width: 100, height: 100 },
  ];
  it('moves down and up inside a column, not to the next element in DOM order', () => {
    expect(nextIndex(rects, 0, 'ArrowDown')).toBe(1);
    expect(nextIndex(rects, 2, 'ArrowDown')).toBe(3);
    expect(nextIndex(rects, 4, 'ArrowUp')).toBe(3);
  });
  it('moves sideways to the closest card in the next column', () => {
    expect(nextIndex(rects, 0, 'ArrowRight')).toBe(2);
    expect(nextIndex(rects, 1, 'ArrowRight')).toBe(4);
    expect(nextIndex(rects, 3, 'ArrowLeft')).toBe(1);
  });
  it('stays put at an edge and jumps with Home and End', () => {
    expect(nextIndex(rects, 1, 'ArrowDown')).toBe(1);
    expect(nextIndex(rects, 0, 'ArrowLeft')).toBe(0);
    expect(nextIndex(rects, 3, 'Home')).toBe(0);
    expect(nextIndex(rects, 0, 'End')).toBe(4);
  });
});

describe('url state', () => {
  it('parses and rebuilds search and view, ignoring unknown values', () => {
    expect(parseUrlState('?q=ada&view=favourites')).toEqual({ q: 'ada', view: 'favourites' });
    expect(parseUrlState('?view=evil&q=')).toEqual({ q: '', view: 'all' });
    expect(buildSearch({ q: ' ada lovelace ', view: 'favourites' })).toBe('?q=ada+lovelace&view=favourites');
    expect(buildSearch({ q: '  ', view: 'all' })).toBe('');
  });
});

describe('favourites import and export', () => {
  it('round-trips an export', () => {
    const text = exportFavourites(['1', '22'], new Date('2026-01-02T03:04:05Z'));
    expect(JSON.parse(text)).toMatchObject({ app: 'celebrare-photo-gallery', version: 1, exportedAt: '2026-01-02T03:04:05.000Z' });
    expect(parseFavouritesFile(text)).toEqual(['1', '22']);
  });
  it('accepts a bare array, de-duplicates and drops invalid ids', () => {
    expect(parseFavouritesFile('[1, "2", "2", "x", "<script>"]')).toEqual(['1', '2']);
  });
  it('rejects broken, foreign, empty-of-valid and oversized files with a readable message', () => {
    expect(() => parseFavouritesFile('{nope')).toThrow('not valid JSON');
    expect(() => parseFavouritesFile('{"hello":1}')).toThrow('not a Celebrare favourites export');
    expect(() => parseFavouritesFile('["a","b"]')).toThrow('None of the photograph ids');
    expect(() => parseFavouritesFile(JSON.stringify(Array.from({ length: 2001 }, (_, i) => i)))).toThrow('more than 2000');
  });
});
