import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

const FOCUSABLE = 'button, a[href], [tabindex]:not([tabindex="-1"])';
const navButton = 'flex size-12 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white aria-disabled:cursor-not-allowed aria-disabled:opacity-30 aria-disabled:hover:bg-white/10';

export default function Lightbox({ photo, index, total, onClose, onPrevious, onNext }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const titleId = useId();
  const hasPrevious = index > 0;
  const hasNext = index < total - 1;

  // Latest handlers for the document key listener, without re-binding it on every render.
  const handlers = useRef({});
  useEffect(() => {
    handlers.current = { onClose, onPrevious, onNext, hasPrevious, hasNext };
  });

  useEffect(() => {
    closeRef.current.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event) {
      const { onClose, onPrevious, onNext, hasPrevious, hasNext } = handlers.current;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowLeft' && hasPrevious) {
        event.preventDefault();
        onPrevious();
      } else if (event.key === 'ArrowRight' && hasNext) {
        event.preventDefault();
        onNext();
      } else if (event.key === 'Tab') {
        const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const inside = dialogRef.current.contains(document.activeElement);
        if (event.shiftKey && (document.activeElement === first || !inside)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex flex-col bg-stone-950/95 text-white"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div aria-live="polite" className="min-w-0">
          <h2 id={titleId} className="truncate font-serif text-lg">Photograph by {photo.author}</h2>
          <p className="text-xs text-stone-300">{index + 1} of {total}</p>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className={navButton}>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center gap-2 px-2 pb-6 sm:gap-4 sm:px-6">
        <button type="button" onClick={hasPrevious ? onPrevious : undefined} aria-disabled={!hasPrevious} aria-label="Previous photo" className={`${navButton} shrink-0`}>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m15 5-7 7 7 7" /></svg>
        </button>
        <img
          key={photo.id}
          src={`https://picsum.photos/id/${encodeURIComponent(photo.id)}/1280/960`}
          alt={`Photograph by ${photo.author}`}
          width="1280" height="960"
          className="max-h-full min-w-0 max-w-full flex-1 rounded-lg bg-stone-800 object-contain"
        />
        <button type="button" onClick={hasNext ? onNext : undefined} aria-disabled={!hasNext} aria-label="Next photo" className={`${navButton} shrink-0`}>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" /></svg>
        </button>
      </div>
    </div>,
    document.body,
  );
}
