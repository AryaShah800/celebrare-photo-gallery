export default function PhotoCard({ photo, favourite, onToggle, onOpen, thumbRef }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <button
        ref={thumbRef}
        type="button"
        onClick={() => onOpen(photo.id)}
        aria-label={`Open photograph by ${photo.author}`}
        className="block w-full cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-emerald-800"
      >
        <img
          src={`https://picsum.photos/id/${encodeURIComponent(photo.id)}/640/480`}
          alt={`Photograph by ${photo.author}`}
          width="640" height="480" loading="lazy"
          className="aspect-[4/3] w-full bg-stone-100 object-cover"
        />
      </button>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">Photograph by</p>
          <h2 className="truncate text-sm font-medium text-stone-800" title={photo.author}>{photo.author}</h2>
        </div>
        <button
          type="button"
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
