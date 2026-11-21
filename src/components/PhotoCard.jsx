import { useEffect, useRef, useState } from 'react';
import { picsumSrc, ratioOf } from '../lib/masonry';

const SIZES = '(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw';

export default function PhotoCard({ photo, favourite, active, eager = false, onToggle, onOpen, onFocusThumb, thumbRef }) {
  const ratio = ratioOf(photo);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);

  // A cached image can finish before React attaches onLoad.
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <button
        ref={thumbRef}
        type="button"
        tabIndex={active ? 0 : -1}
        data-photo-id={photo.id}
        onClick={() => onOpen(photo.id)}
        onFocus={() => onFocusThumb(photo.id)}
        aria-label={`Open photograph by ${photo.author}`}
        aria-keyshortcuts="F"
        className="relative block w-full cursor-zoom-in overflow-hidden bg-stone-100 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-emerald-800"
        // The box is reserved from the photo's real dimensions, so nothing moves when the image arrives.
        style={{ aspectRatio: `${1} / ${ratio}` }}
      >
        {!loaded && !photo.unavailable && (
          <img
            src={picsumSrc(photo.id, 24, ratio)}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 size-full scale-110 object-cover blur-xl"
          />
        )}
        <img
          ref={imgRef}
          src={picsumSrc(photo.id, 640, ratio)}
          srcSet={`${picsumSrc(photo.id, 400, ratio)} 400w, ${picsumSrc(photo.id, 640, ratio)} 640w, ${picsumSrc(photo.id, 960, ratio)} 960w`}
          sizes={SIZES}
          alt={`Photograph by ${photo.author}`}
          width="640"
          height={Math.round(640 * ratio)}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : undefined}
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`relative size-full object-cover transition-opacity duration-300 motion-reduce:transition-none ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </button>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">Photograph by</p>
          <h2 className="truncate text-sm font-medium text-stone-800" title={photo.author}>{photo.author}</h2>
        </div>
        <button
          type="button"
          tabIndex={active ? 0 : -1}
          aria-label={`${favourite ? 'Remove' : 'Add'} photo ${photo.id} ${favourite ? 'from' : 'to'} favourites`}
          aria-pressed={favourite}
          onClick={() => onToggle(photo.id)}
          className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-800 ${favourite ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-stone-50 text-stone-500 hover:bg-stone-100 hover:text-rose-600'}`}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill={favourite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
          </svg>
        </button>
      </div>
    </article>
  );
}
