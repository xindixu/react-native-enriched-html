"use strict";

import { HEADING_LEVELS, HEADING_TAGS } from "./EnrichedHeading.js";
export function isAnyParagraphFormatActive(editor) {
  return editor.isActive('blockquote') || editor.isActive('codeBlock') || HEADING_LEVELS.some(level => editor.isActive('heading', {
    level
  })) || editor.isActive('orderedList') || editor.isActive('unorderedList') || editor.isActive('checkboxList');
}
export function isLinkBlocked(editor) {
  return editor.isActive('code') || editor.isActive('codeBlock') || editor.isActive('mention') || editor.isActive('image');
}
function isMentionBlocked(editor) {
  return editor.isActive('code') || editor.isActive('codeBlock') || editor.isActive('link') || editor.isActive('image');
}
export function isImageBlocked(editor) {
  return editor.isActive('code') || editor.isActive('link') || editor.isActive('mention');
}
export function isFormatBlocked(tiptapName, editor, htmlStyle) {
  if (tiptapName === 'image') {
    return isImageBlocked(editor);
  }
  if (tiptapName === 'link') {
    return isLinkBlocked(editor);
  }
  if (tiptapName === 'code' && editor.isActive('image')) {
    return true;
  }
  if (tiptapName === 'mention') {
    return isMentionBlocked(editor);
  }
  if (editor.isActive('codeBlock')) {
    return ['bold', 'italic', 'underline', 'strike', 'code'].includes(tiptapName);
  }
  for (const level of HEADING_LEVELS) {
    if (editor.isActive('heading', {
      level
    })) {
      const key = HEADING_TAGS[level - 1];
      if (tiptapName === 'bold' && htmlStyle[key].bold) return true;
    }
  }
  return false;
}
export function toggleParagraphFormat(isActive, deactivate, activate, chain, editor) {
  if (isActive()) {
    return withPreservedAlignment(editor, chain(), c => {
      deactivate();
      return c;
    });
  }
  return withPreservedAlignment(editor, chain(), c => activate(c.clearNodes()));
}
export function getCurrentAlignment(editor) {
  const {
    doc,
    selection
  } = editor.state;
  let {
    $from
  } = selection;

  // If the user presses Cmd+A, the selection anchors to the document root (depth 0).
  // We resolve position '1' to step exactly inside the first paragraph node
  // so the loop can correctly read its alignment.
  if ($from.depth === 0 && doc.content.size > 0) {
    $from = doc.resolve(1);
  }
  for (let depth = $from.depth; depth >= 0; depth--) {
    const node = $from.node(depth);
    if (node.attrs.textAlign) {
      return node.attrs.textAlign;
    }
  }
  return null;
}
export function withPreservedAlignment(editor, chain, mutateChain) {
  const currentAlignment = getCurrentAlignment(editor);
  const c = mutateChain(chain);
  if (currentAlignment && currentAlignment !== 'auto') {
    c.setTextAlign(currentAlignment);
  }
  return c.run();
}
//# sourceMappingURL=formatRules.js.map