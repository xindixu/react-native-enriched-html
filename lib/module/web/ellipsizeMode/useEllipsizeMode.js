"use strict";

import { useLayoutEffect } from 'react';
import { headEllipsize } from "./headEllipsize.js";
import { clip } from "./clip.js";
import { tailEllipsize } from "./tailEllipsize.js";
import { middleEllipsize } from "./middleEllipsize.js";
export function useEllipsizeMode({
  containerRef,
  finalHtml,
  ellipsizeMode,
  numberOfLines,
  setClampedHtml,
  style,
  htmlStyle
}) {
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (numberOfLines <= 0) {
      setClampedHtml(finalHtml);
      return;
    }
    switch (ellipsizeMode) {
      case 'head':
        headEllipsize(container, finalHtml, numberOfLines, setClampedHtml);
        break;
      case 'middle':
        middleEllipsize(container, finalHtml, numberOfLines, setClampedHtml);
        break;
      case 'tail':
        tailEllipsize(container, finalHtml, numberOfLines, setClampedHtml);
        break;
      case 'clip':
        clip(container, finalHtml, numberOfLines, setClampedHtml);
        break;
    }
  }, [containerRef, finalHtml, ellipsizeMode, numberOfLines, setClampedHtml, style, htmlStyle]);
}
//# sourceMappingURL=useEllipsizeMode.js.map