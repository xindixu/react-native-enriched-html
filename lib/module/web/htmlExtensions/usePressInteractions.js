"use strict";

import { useEffect } from 'react';
export function usePressInteractions(containerRef, onLinkPressRef, onMentionPressRef) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleInteraction = e => {
      const target = e.target;
      const checkbox = target.closest("input[type='checkbox']");
      if (checkbox && container.contains(checkbox)) {
        e.preventDefault();
      }
      const anchor = target.closest('a');
      if (anchor && container.contains(anchor)) {
        e.preventDefault();
        const url = anchor.getAttribute('href');
        if (url && onLinkPressRef.current) {
          onLinkPressRef.current({
            url
          });
        }
      }
      const mention = target.closest('mention');
      if (mention && container.contains(mention)) {
        if (onMentionPressRef.current) {
          const customAttributes = {};
          for (const attr of Array.from(mention.attributes)) {
            if (attr.name !== 'text' && attr.name !== 'indicator') {
              customAttributes[attr.name] = attr.value;
            }
          }
          onMentionPressRef.current({
            text: mention.getAttribute('text') ?? '',
            indicator: mention.getAttribute('indicator') ?? '',
            attributes: customAttributes
          });
        }
      }
    };
    container.addEventListener('click', handleInteraction);
    return () => container.removeEventListener('click', handleInteraction);
  }, [containerRef, onLinkPressRef, onMentionPressRef]);
}
//# sourceMappingURL=usePressInteractions.js.map