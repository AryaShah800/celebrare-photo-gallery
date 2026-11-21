import { useEffect, useState } from 'react';
import { columnCountFor } from '../lib/masonry';

/** Number of masonry columns for the current viewport width. */
export default function useColumns() {
  const [count, setCount] = useState(() => columnCountFor(window.innerWidth));
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setCount(columnCountFor(window.innerWidth)));
    };
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
    };
  }, []);
  return count;
}
