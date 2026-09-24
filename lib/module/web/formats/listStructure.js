"use strict";

import { isTextSelection } from '@tiptap/core';
import { Fragment } from '@tiptap/pm/model';
import { closeHistory } from '@tiptap/pm/history';
import { TextSelection } from '@tiptap/pm/state';
export const LIST_NAMES = ['unorderedList', 'orderedList', 'checkboxList'];
export const ITEM_CONTENT = 'paragraph (unorderedList | orderedList | checkboxList)*';
export const children = node => Array.from({
  length: node.childCount
}, (_, index) => node.child(index));
const itemDepth = $pos => {
  for (let depth = $pos.depth; depth > 0; depth--) {
    if (['listItem', 'checkboxItem'].includes($pos.node(depth).type.name)) return depth;
  }
  return 0;
};

/** Only paragraphs belonging to sibling items may participate in one operation. */
export function selectedList(selection) {
  if (!isTextSelection(selection)) return null;
  const {
    $from,
    $to
  } = selection;
  const depth = itemDepth($from);
  if (!depth || itemDepth($to) !== depth || $from.before(depth - 1) !== $to.before(depth - 1)) return null;
  return {
    depth: depth - 1,
    list: $from.node(depth - 1),
    from: $from.index(depth - 1),
    to: $to.index(depth - 1) + 1
  };
}

/** Structural edits reuse paragraphs, allowing anchor and head to follow their content. */
export function replaceList(tr, pos, node, replacement) {
  const {
    $anchor,
    $head
  } = tr.selection;
  closeHistory(tr);
  tr.replaceWith(pos, pos + node.nodeSize, Fragment.from(replacement));
  const locate = $old => {
    let result = tr.mapping.map($old.pos);
    tr.doc.descendants((child, childPos) => {
      if (child === $old.parent) {
        result = childPos + 1 + $old.parentOffset;
        return false;
      }
      return true;
    });
    return result;
  };
  tr.setSelection(TextSelection.create(tr.doc, locate($anchor), locate($head)));
}
export function outdentList(tr) {
  const selected = selectedList(tr.selection);
  if (!selected) return false;
  const {
    depth,
    list,
    from,
    to
  } = selected;
  const $from = tr.selection.$from;
  const items = children(list);
  const lifted = items.slice(from, to);
  if (depth > 1 && ['listItem', 'checkboxItem'].includes($from.node(depth - 1).type.name)) {
    const parent = $from.node(depth - 1);
    const outer = $from.node(depth - 2);
    const parentIndex = $from.index(depth - 2);
    const listIndex = $from.index(depth - 1);
    const parentContent = children(parent);
    const remaining = parentContent.slice(0, listIndex);
    if (from) remaining.push(list.copy(Fragment.from(items.slice(0, from))));
    const itemType = parent.type;
    const converted = lifted.map(item => item.type === itemType ? item : itemType.create(null, item.content));
    const tail = items.slice(to);
    const last = converted[converted.length - 1];
    const trailing = [...(tail.length ? [list.copy(Fragment.from(tail))] : []), ...parentContent.slice(listIndex + 1)];
    converted[converted.length - 1] = last.copy(last.content.append(Fragment.from(trailing)));
    const outerItems = children(outer);
    outerItems.splice(parentIndex, 1, parent.copy(Fragment.from(remaining)), ...converted);
    replaceList(tr, $from.before(depth - 2), outer, [outer.copy(Fragment.from(outerItems))]);
  } else {
    const replacement = [...(from ? [list.copy(Fragment.from(items.slice(0, from)))] : []), ...lifted.flatMap(children), ...(to < items.length ? [list.copy(Fragment.from(items.slice(to)))] : [])];
    replaceList(tr, $from.before(depth), list, replacement);
  }
  if (list.attrs.textAlign) {
    const paragraphs = new Set(lifted.map(item => item.firstChild));
    tr.doc.descendants((node, pos) => {
      if (paragraphs.has(node) && !node.attrs.textAlign) {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          textAlign: list.attrs.textAlign
        });
      }
    });
  }
  return true;
}
//# sourceMappingURL=listStructure.js.map