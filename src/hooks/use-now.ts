import { useEffect, useState } from 'react';

/** The current time, refreshed every `every` ms while `live`. */
export function useNow(live = true, every = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(timer);
  }, [live, every]);
  return now;
}
