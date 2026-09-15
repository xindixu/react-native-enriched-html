import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { Editor } from '@tiptap/core';
import type { EnrichedTextInputProps } from '../../types';
import { adaptWebToNativeEvent } from '../nativeMappers/adaptWebToNativeEvent';

/** Reports caret geometry relative to the input's outer view after layout. */
export function useOnCaretChange(
  editor: Editor | null,
  container: RefObject<HTMLElement | null>,
  onCaretChange: EnrichedTextInputProps['onCaretChange']
) {
  const callback = useRef(onCaretChange);
  callback.current = onCaretChange;
  const enabled = !!onCaretChange;
  useLayoutEffect(() => {
    const host = container.current;
    if (!editor || editor.isDestroyed || !host || !enabled) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      if (editor.isDestroyed || !host.isConnected) return;
      const { selection } = editor.state;
      const rect = editor.view.coordsAtPos(selection.head);
      const bounds = host.getBoundingClientRect();
      callback.current?.(
        adaptWebToNativeEvent(null, {
          x: rect.left - bounds.left,
          y: rect.top - bounds.top,
          width: rect.right - rect.left,
          height: rect.bottom - rect.top,
          visible:
            selection.empty &&
            rect.bottom > rect.top &&
            rect.top >= bounds.top &&
            rect.bottom <= bounds.bottom &&
            rect.left >= bounds.left &&
            rect.left <= bounds.right,
        })
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(schedule);
    observer?.observe(host);
    observer?.observe(editor.view.dom);
    editor.on('transaction', schedule);
    // Capture includes the input's internal scroller and surrounding scroll views.
    document.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      editor.off('transaction', schedule);
      document.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [editor, container, enabled]);
}
