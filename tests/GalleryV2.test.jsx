import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Gallery from '../src/components/Gallery';
import { FAVOURITES_KEY } from '../src/state/favourites';

const photos = [
  { id: '1', author: 'Alice Brown', width: 1000, height: 500 },
  { id: '2', author: 'Ben Smith', width: 1000, height: 1500 },
  { id: '3', author: 'Cleo Park', width: 1000, height: 1000 },
];

function mockApi(extra = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async url => {
    const text = String(url);
    if (text.includes('/v2/list')) return { ok: true, json: async () => photos };
    const info = extra[text.match(/\/id\/(\d+)\/info/)?.[1]];
    return info ? { ok: true, json: async () => info } : { ok: false, json: async () => ({}) };
  });
}

const open = name => screen.getByRole('button', { name: `Open photograph by ${name}` });

describe('layout without shift', () => {
  it('reserves each photo box from its real aspect ratio before the image loads', async () => {
    mockApi();
    render(<Gallery />);
    await screen.findByText('Ben Smith');
    expect(open('Ben Smith').style.aspectRatio).toBe('1 / 1.5');
    const image = screen.getByAltText('Photograph by Ben Smith');
    expect(image).toHaveAttribute('width', '640');
    expect(image).toHaveAttribute('height', '960');
    expect(image.getAttribute('srcset')).toContain('/id/2/400/600 400w');
  });

  it('shows a blurred low-resolution placeholder until the full image loads, then removes it', async () => {
    mockApi();
    const { container } = render(<Gallery />);
    await screen.findByAltText('Photograph by Alice Brown');
    expect(container.querySelectorAll('img[aria-hidden="true"]').length).toBe(3);
    expect(container.querySelector('img[aria-hidden="true"]').getAttribute('src')).toMatch(/\/24\/\d+$/);
    fireEvent.load(screen.getByAltText('Photograph by Alice Brown'));
    expect(container.querySelectorAll('img[aria-hidden="true"]').length).toBe(2);
  });
});

describe('keyboard', () => {
  it('makes one photo the tab stop and moves it with the arrow keys and Home', async () => {
    mockApi();
    render(<Gallery />);
    await screen.findByText('Alice Brown');
    // jsdom has no layout: give the thumbnails positions in two columns.
    const boxes = { 'Alice Brown': [0, 0], 'Cleo Park': [0, 200], 'Ben Smith': [220, 0] };
    for (const [name, [left, top]] of Object.entries(boxes)) {
      open(name).getBoundingClientRect = () => ({ left, top, width: 200, height: 150 });
    }
    expect(open('Alice Brown')).toHaveAttribute('tabindex', '0');
    expect(open('Ben Smith')).toHaveAttribute('tabindex', '-1');
    open('Alice Brown').focus();
    fireEvent.keyDown(open('Alice Brown'), { key: 'ArrowRight' });
    expect(open('Ben Smith')).toHaveFocus();
    expect(open('Ben Smith')).toHaveAttribute('tabindex', '0');
    expect(open('Alice Brown')).toHaveAttribute('tabindex', '-1');
    fireEvent.keyDown(open('Ben Smith'), { key: 'Home' });
    expect(open('Alice Brown')).toHaveFocus();
  });

  it('toggles the favourite of the focused photograph with F', async () => {
    mockApi();
    render(<Gallery />);
    await screen.findByText('Alice Brown');
    fireEvent.keyDown(open('Alice Brown'), { key: 'f' });
    await waitFor(() => expect(JSON.parse(localStorage.getItem(FAVOURITES_KEY))).toEqual(['1']));
  });
});

describe('shareable URL', () => {
  it('starts from ?q= and writes the search back to the address bar without adding history entries', async () => {
    window.history.replaceState(null, '', '/?q=ben');
    mockApi();
    const pushed = vi.spyOn(window.history, 'pushState');
    render(<Gallery />);
    await screen.findByText('Ben Smith');
    expect(screen.getByRole('searchbox')).toHaveValue('ben');
    expect(screen.queryByText('Alice Brown')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'cleo' } });
    expect(window.location.search).toBe('?q=cleo');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    expect(window.location.search).toBe('');
    expect(pushed).not.toHaveBeenCalled();
  });

  it('puts the favourites view in the URL, and Back returns to the gallery', async () => {
    mockApi();
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(['2']));
    render(<Gallery />);
    await screen.findByText('Alice Brown');
    fireEvent.click(screen.getByRole('button', { name: /Favourites \(1\)/ }));
    expect(window.location.search).toBe('?view=favourites');
    expect(screen.queryByText('Alice Brown')).not.toBeInTheDocument();
    expect(screen.getByText('Ben Smith')).toBeInTheDocument();
    window.history.back();
    await waitFor(() => expect(screen.getByText('Alice Brown')).toBeInTheDocument());
  });
});

describe('favourites collection', () => {
  it('opens the favourites view in a fresh session by fetching photographers it has not loaded', async () => {
    window.history.replaceState(null, '', '/?view=favourites');
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(['77']));
    const fetchMock = mockApi({ 77: { id: '77', author: 'Zed Young', width: 800, height: 600 } });
    render(<Gallery />);
    expect(await screen.findByText('Zed Young')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('https://picsum.photos/id/77/info', expect.any(Object));
  });

  it('shows an empty state with guidance', async () => {
    window.history.replaceState(null, '', '/?view=favourites');
    mockApi();
    render(<Gallery />);
    expect(await screen.findByText('No favourites yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export JSON' })).toBeDisabled();
  });

  it('imports a file by merging it into the saved favourites and reports what was new', async () => {
    window.history.replaceState(null, '', '/?view=favourites');
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(['1']));
    mockApi();
    render(<Gallery />);
    const body = JSON.stringify({ app: 'celebrare-photo-gallery', version: 1, favourites: ['1', '2'] });
    const file = new File([body], 'f.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText('Import favourites file'), { target: { files: [file] } });
    expect(await screen.findByText('Imported 2 photographs, 1 new.')).toBeInTheDocument();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(FAVOURITES_KEY))).toEqual(['1', '2']));
  });

  it('rejects an invalid file without touching saved favourites', async () => {
    window.history.replaceState(null, '', '/?view=favourites');
    localStorage.setItem(FAVOURITES_KEY, JSON.stringify(['1']));
    mockApi();
    render(<Gallery />);
    const file = new File(['not json'], 'f.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText('Import favourites file'), { target: { files: [file] } });
    expect(await screen.findByText('That file is not valid JSON.')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(FAVOURITES_KEY))).toEqual(['1']);
  });
});

describe('offline notice', () => {
  it('tells the user when the browser goes offline', async () => {
    mockApi();
    render(<Gallery />);
    await screen.findByText('Alice Brown');
    fireEvent(window, new Event('offline'));
    expect(await screen.findByText(/You are offline/)).toBeInTheDocument();
    fireEvent(window, new Event('online'));
    await waitFor(() => expect(screen.queryByText(/You are offline/)).not.toBeInTheDocument());
  });
});

describe('lightbox', () => {
  it('opens a portrait photograph at its real aspect ratio, not a 4:3 crop', async () => {
    mockApi();
    render(<Gallery />);
    await screen.findByText('Ben Smith');
    fireEvent.click(open('Ben Smith'));
    const image = screen.getByRole('dialog').querySelector('img');
    expect(image.getAttribute('src')).toBe('https://picsum.photos/id/2/1067/1600');
    expect(Number(image.getAttribute('height'))).toBeGreaterThan(Number(image.getAttribute('width')));
  });
});
