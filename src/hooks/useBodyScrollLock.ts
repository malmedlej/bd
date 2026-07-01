import { useEffect } from 'react';

export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;

    const scrollY = window.scrollY;
    const { overflow, position, top, width } = document.body.style;
    const previousOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.documentElement.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.position = position;
      document.body.style.top = top;
      document.body.style.width = width;
      document.documentElement.style.overscrollBehavior = previousOverscroll;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
