"use strict";

import Link from '@tiptap/extension-link';
import { mergeAttributes } from '@tiptap/core';
import { nativePosToTiptapPos } from "../nativeMappers/positionMapping.js";
import { isLinkBlocked } from "./formatRules.js";
import { findAutolinkRangesInWord } from "../pmPlugins/AutolinkPlugin/autolinkRegex.js";
function isFullLinkMatch(text, linkRegex) {
  const ranges = findAutolinkRangesInWord(text, linkRegex);
  return ranges.some(r => r.start === 0 && r.endExclusive === text.length);
}
export const EnrichedLink = Link.extend({
  excludes: 'link code',
  parseHTML() {
    return [{
      tag: 'a[href]',
      getAttrs: node => {
        if (typeof node === 'string') return null;
        const href = node.getAttribute('href');
        if (!href || /^javascript:/i.test(href)) return false;
        return null;
      }
    }];
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      auto: {
        default: false,
        parseHTML: el => {
          const href = el.getAttribute('href');
          const textContent = el.textContent;
          if (!href || href !== textContent) return false;
          const linkRegex = this.options.getLinkRegex();
          if (linkRegex === null) return false;
          return isFullLinkMatch(href, linkRegex);
        },
        renderHTML: () => {
          return {};
        }
      }
    };
  },
  renderHTML({
    HTMLAttributes
  }) {
    return ['a', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
  addOptions() {
    const parent = this.parent?.();
    return {
      ...parent,
      openOnClick: false,
      autolink: false,
      linkOnPaste: false,
      HTMLAttributes: {
        ...parent.HTMLAttributes,
        target: null,
        rel: null
      },
      getLinkRegex: () => {
        throw new Error('EnrichedLink.configure({ getLinkRegex }) is required');
      }
    };
  },
  addKeyboardShortcuts() {
    return {};
  },
  addCommands() {
    const parent = this.parent?.();
    return {
      ...parent,
      setLink: attributes => props => {
        if (isLinkBlocked(props.editor)) {
          return false;
        }
        return parent?.setLink?.(attributes)(props) ?? false;
      },
      toggleLink: attributes => props => {
        if (isLinkBlocked(props.editor)) {
          return false;
        }
        return parent?.toggleLink?.(attributes)(props) ?? false;
      },
      unsetLink: () => props => {
        if (isLinkBlocked(props.editor)) {
          return false;
        }
        return parent?.unsetLink?.()(props) ?? false;
      }
    };
  },
  addPasteRules() {
    return [];
  }
});
export function removeLink(editor, start, end) {
  const {
    doc,
    selection: selectionBefore
  } = editor.state;
  const from = nativePosToTiptapPos(doc, start);
  const to = nativePosToTiptapPos(doc, end);
  editor.chain().focus().setTextSelection({
    from,
    to
  }).unsetLink().command(({
    tr
  }) => {
    const mapped = selectionBefore.map(tr.doc, tr.mapping);
    if (mapped) {
      tr.setSelection(mapped);
    }
    return true;
  }).run();
}
export function setLink(editor, start, end, text, url) {
  if (url.length === 0 || text.length === 0) {
    return;
  }
  const {
    state
  } = editor;
  const doc = state.doc;
  const from = nativePosToTiptapPos(doc, start);
  const to = nativePosToTiptapPos(doc, end);
  if (isRangeLinkBlocked(editor, from, to)) {
    return;
  }
  const linkType = state.schema.marks.link;
  if (!linkType) return;
  const linkMark = linkType.create({
    href: url
  });
  editor.chain().focus().command(({
    tr,
    state: s
  }) => {
    if (from === to) {
      const marksAtRangeStart = doc.resolve(from).marks();
      const marksWithLink = linkMark.addToSet(marksAtRangeStart);
      tr.insert(from, s.schema.text(text, marksWithLink));
    } else {
      const currentText = doc.textBetween(from, to);
      if (text !== currentText) {
        const marksAtRangeStart = doc.resolve(from).marks();
        const marksWithLink = linkMark.addToSet(marksAtRangeStart);
        tr.replaceWith(from, to, s.schema.text(text, marksWithLink));
      } else {
        tr.addMark(from, to, linkMark);
      }
    }
    return true;
  }).run();
}

// We use this function instead of relying on editor.isActive('...') because it
// checks the current selection, not from and to passed by user
function isRangeLinkBlocked(editor, from, to) {
  const {
    doc,
    schema
  } = editor.state;
  const hasInlineCode = schema.marks.code && doc.rangeHasMark(from, to, schema.marks.code);
  if (hasInlineCode) {
    return true;
  }
  let hasBlockedNode = false;
  const blockedNodes = ['codeBlock', 'image'];
  doc.nodesBetween(from, to, node => {
    if (hasBlockedNode) return false;
    if (blockedNodes.includes(node.type.name)) {
      hasBlockedNode = true;
      return false;
    }
    return true;
  });
  return hasBlockedNode;
}
//# sourceMappingURL=EnrichedLink.js.map