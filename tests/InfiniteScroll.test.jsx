import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Gallery from '../src/components/Gallery';
import { PAGE_SIZE, photosUrl } from '../src/hooks/useFetchPhotos';
import { installIntersectionObserver, scrollToSentinel, activeObserverCount } from './intersectionObserver';

function makePage(page, count = PAGE_SIZE) {
  return Array.from({ length: count }, (_, i) => ({ id: `${page}-${i}`, author: `Author ${page}-${i}` }));
}
function ok(data) {
  return { ok: true, json: async () => data };
}
/** Serves pages from a map; a page set to a function is resolved by the test. */
function mockPages(pages) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(url => {
    const page = Number(new URL(url).searchParams.get('page'));
    const value = pages[page];
    if (typeof value === 'function') return value();
    if (value instanceof Error) return Promise.reject(value);
    return Promise.resolve(ok(value ?? []));
  });
}

beforeEach(installIntersectionObserver);
afterEach(() => vi.unstubAllGlobals());

describe('Infinite scroll', () => {
  it('loads the next page when the sentinel scrolls into view', async () => {
    const fetchMock = mockPages({ 1: makePage(1), 2: makePage(2) });
    render(<Gallery />);
    await screen.findByText('Author 1-0');
    expect(screen.getAllByRole('article')).toHaveLength(30);

    scrollToSentinel();

    expect(await screen.findByText('Author 2-0')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(60);
    expect(fetchMock).toHaveBeenLastCalledWith(photosUrl(2), expect.any(Object));
  });

  it('stops after a short page and says the collection has ended', async () => {
    const fetchMock = mockPages({ 1: makePage(1), 2: makePage(2, 5) });
    render(<Gallery />);
    await screen.findByText('Author 1-0');
    scrollToSentinel();

    expect(await screen.findByText('You’ve reached the end of the collection.')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(35);
    expect(screen.queryByTestId('scroll-sentinel')).not.toBeInTheDocument();
    expect(activeObserverCount()).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('skips photos that were already loaded', async () => {
    mockPages({ 1: makePage(1), 2: [...makePage(1, 2), ...makePage(2, 28)] });
    render(<Gallery />);
    await screen.findByText('Author 1-0');
    scrollToSentinel();

    await screen.findByText('Author 2-0');
    expect(screen.getAllByRole('article')).toHaveLength(58);
    expect(screen.getAllByText('Author 1-0')).toHaveLength(1);
  });

  it('keeps loaded photos when the next page fails, and retries', async () => {
    const pages = { 1: makePage(1), 2: new Error('offline') };
    const fetchMock = mockPages(pages);
    render(<Gallery />);
    await screen.findByText('Author 1-0');
    scrollToSentinel();

    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t load more photos');
    expect(screen.getAllByRole('article')).toHaveLength(30);
    expect(activeObserverCount()).toBe(0);

    pages[2] = makePage(2);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Author 2-0')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('loads the next page from the Load more button', async () => {
    mockPages({ 1: makePage(1), 2: makePage(2) });
    render(<Gallery />);
    fireEvent.click(await screen.findByRole('button', { name: 'Load more photographs' }));
    expect(await screen.findByText('Author 2-0')).toBeInTheDocument();
  });

  it('pauses loading while a search is active and resumes when it is cleared', async () => {
    const fetchMock = mockPages({ 1: makePage(1), 2: makePage(2) });
    render(<Gallery />);
    await screen.findByText('Author 1-0');

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Author 1-1' } });
    scrollToSentinel();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Showing matches from the 30 photographs loaded so far/)).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    scrollToSentinel();
    expect(await screen.findByText('Author 2-0')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('starts only one request when the sentinel fires repeatedly', async () => {
    let resolvePage2;
    const fetchMock = mockPages({ 1: makePage(1), 2: () => new Promise(done => { resolvePage2 = done; }) });
    render(<Gallery />);
    await screen.findByText('Author 1-0');

    scrollToSentinel(3);
    scrollToSentinel();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith(photosUrl(2), expect.any(Object));

    await act(async () => resolvePage2(ok(makePage(2))));
    expect(screen.getAllByRole('article')).toHaveLength(60);
  });

  it('aborts an in-flight page request on unmount', async () => {
    const fetchMock = mockPages({ 1: makePage(1), 2: () => new Promise(() => {}) });
    const { unmount } = render(<Gallery />);
    await screen.findByText('Author 1-0');
    scrollToSentinel();

    const { signal } = fetchMock.mock.calls[1][1];
    expect(signal.aborted).toBe(false);
    unmount();
    expect(signal.aborted).toBe(true);
  });
});
