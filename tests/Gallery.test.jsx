import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Gallery from '../src/components/Gallery';
import { FAVOURITES_KEY } from '../src/state/favourites';

const photos = [
  { id: '1', author: 'Alice Brown' },
  { id: '2', author: 'Ben Smith' },
];
function mockPhotos() {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => photos });
}

describe('Gallery requirements', () => {
  it('shows loading until the request completes', async () => {
    let resolve;
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(done => { resolve = done; }));
    render(<Gallery />);
    expect(screen.getByText('Loading photographs…')).toBeInTheDocument();
    resolve({ ok: true, json: async () => photos });
    expect(await screen.findByText('Alice Brown')).toBeInTheDocument();
    expect(screen.queryByText('Loading photographs…')).not.toBeInTheDocument();
  });
  it('filters locally, ignores case and surrounding whitespace, and shows no matches', async () => {
    const fetchMock = mockPhotos();
    render(<Gallery />);
    await screen.findByText('Alice Brown');
    expect(fetchMock).toHaveBeenCalledWith('https://picsum.photos/v2/list?limit=30', expect.any(Object));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: ' ALICE ' } });
    expect(screen.getByText('Alice Brown')).toBeInTheDocument();
    expect(screen.queryByText('Ben Smith')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } });
    expect(screen.getByText('No photographs found')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    expect(screen.getAllByRole('article')).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('toggles favourites, restores them on remount, and persists removal', async () => {
    mockPhotos();
    const first = render(<Gallery />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add photo 1 to favourites' }));
    expect(screen.getByRole('button', { name: 'Remove photo 1 from favourites' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(JSON.parse(localStorage.getItem(FAVOURITES_KEY))).toEqual(['1']));
    first.unmount();
    render(<Gallery />);
    fireEvent.click(await screen.findByRole('button', { name: 'Remove photo 1 from favourites' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(FAVOURITES_KEY))).toEqual([]));
  });
  it.each(['network', 'http', 'invalid'])('shows an error for %s failure', async kind => {
    const mock = vi.spyOn(globalThis, 'fetch');
    if (kind === 'network') mock.mockRejectedValue(new Error('offline'));
    else mock.mockResolvedValue({ ok: kind !== 'http', json: async () => ({ unexpected: true }) });
    render(<Gallery />);
    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t load the photos');
    expect(screen.queryByText('Loading photographs…')).not.toBeInTheDocument();
  });
  it('recovers from corrupted saved favourites', async () => {
    localStorage.setItem(FAVOURITES_KEY, '{broken');
    mockPhotos();
    render(<Gallery />);
    expect(await screen.findByRole('button', { name: 'Add photo 1 to favourites' })).toHaveAttribute('aria-pressed', 'false');
  });
  it('keeps toggling working when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    mockPhotos();
    render(<Gallery />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add photo 1 to favourites' }));
    expect(screen.getByRole('button', { name: 'Remove photo 1 from favourites' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('couldn’t save favourites');
  });
});
