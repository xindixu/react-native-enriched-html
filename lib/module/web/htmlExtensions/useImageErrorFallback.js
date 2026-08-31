"use strict";

import { useEffect } from 'react';

/*
 * Flag images that fail to load so CSS can swap in a broken-image placeholder.
 */
export const useImageErrorFallback = containerRef => {
  // listen for errors
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleImageError = e => {
      const target = e.target;
      if (target && target.tagName && target.tagName.toLowerCase() === 'img') {
        target.classList.add('error');
      }
    };
    container.addEventListener('error', handleImageError, true);

    // handle <img> elements that emitted an error event before we could set up a listener
    const images = container.querySelectorAll('img:not(.error)');
    images.forEach(img => {
      if (img.complete && img.naturalHeight === 0) {
        img.classList.add('error');
      }
    });
    return () => {
      container.removeEventListener('error', handleImageError, true);
    };
  }, [containerRef]);
};
//# sourceMappingURL=useImageErrorFallback.js.map