import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Gallery from '../src/components/Gallery';

const photos = [
  { id: '1', author: 'Alice Brown' },
  { id: '2', author: 'Ben Smith' },
  { id: '3', author: 'Carol Brown' },
];

async function openGallery() {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => photos });
  render(<Gallery />);
  await screen.findByText('Alice Brown');
}
const thumb = author => screen.getByRole('button', { name: `Open photograph by ${author}` });
const press = (key, options = {}) => fireEvent.keyDown(document.activeElement ?? document.body, { key, ...options });

describe('Lightbox', () => {
  it('opens an accessible modal dialog and moves focus into it', async () => {
    await openGallery();
    fireEvent.click(thumb('Ben Smith'));

    const dialog = screen.getByRole('dialog', { name: 'Photograph by Ben Smith' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByText('2 of 3')).toBeInTheDocument();
    expect(within(dialog).getByRole('img')).toHaveAttribute('src', 'https://picsum.photos/id/2/1280/960');
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus();
    expect(screen.getByRole('searchbox').closest('[inert]')).not.toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('closes on Escape and returns focus to the thumbnail', async () => {
    await openGallery();
    thumb('Ben Smith').focus();
    fireEvent.click(thumb('Ben Smith'));

    press('Escape');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(thumb('Ben Smith')).toHaveFocus();
    expect(screen.getByRole('searchbox').closest('[inert]')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('moves between photos with the arrow keys and stops at both ends', async () => {
    await openGallery();
    fireEvent.click(thumb('Alice Brown'));

    press('ArrowLeft');
    expect(screen.getByRole('dialog', { name: 'Photograph by Alice Brown' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous photo' })).toHaveAttribute('aria-disabled', 'true');

    press('ArrowRight');
    press('ArrowRight');
    expect(screen.getByRole('dialog', { name: 'Photograph by Carol Brown' })).toBeInTheDocument();
    expect(screen.getByText('3 of 3')).toBeInTheDocument();

    press('ArrowRight');
    expect(screen.getByRole('dialog', { name: 'Photograph by Carol Brown' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next photo' })).toHaveAttribute('aria-disabled', 'true');

    press('ArrowLeft');
    expect(screen.getByRole('dialog', { name: 'Photograph by Ben Smith' })).toBeInTheDocument();
  });

  it('navigates with the Previous and Next buttons', async () => {
    await openGallery();
    fireEvent.click(thumb('Alice Brown'));
    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    expect(screen.getByRole('dialog', { name: 'Photograph by Ben Smith' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous photo' }));
    expect(screen.getByRole('dialog', { name: 'Photograph by Alice Brown' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous photo' }));
    expect(screen.getByRole('dialog', { name: 'Photograph by Alice Brown' })).toBeInTheDocument();
  });

  it('returns focus to the photo that was showing when it closed', async () => {
    await openGallery();
    fireEvent.click(thumb('Alice Brown'));
    press('ArrowRight');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(thumb('Ben Smith')).toHaveFocus();
  });

  it('keeps Tab and Shift+Tab inside the dialog', async () => {
    await openGallery();
    fireEvent.click(thumb('Ben Smith'));
    const close = screen.getByRole('button', { name: 'Close' });
    const next = screen.getByRole('button', { name: 'Next photo' });

    next.focus();
    press('Tab');
    expect(close).toHaveFocus();

    press('Tab', { shiftKey: true });
    expect(next).toHaveFocus();
  });

  it('only steps through photos that match the search', async () => {
    await openGallery();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'brown' } });
    fireEvent.click(thumb('Alice Brown'));
    expect(screen.getByText('1 of 2')).toBeInTheDocument();

    press('ArrowRight');
    expect(screen.getByRole('dialog', { name: 'Photograph by Carol Brown' })).toBeInTheDocument();
    expect(screen.getByText('2 of 2')).toBeInTheDocument();
  });
});
