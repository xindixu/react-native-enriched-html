"use strict";

import { Fragment } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import { nativePosToTiptapPos, tiptapPosToNativePos } from "../nativeMappers/positionMapping.js";
import { withPreservedAlignment } from "./formatRules.js";
import { children, outdentList, replaceList, selectedList } from "./listStructure.js";
export function applyWrappingListToSelection(editor, chain, listTypeName, itemTypeName, itemAttrs = null) {
  const selected = selectedList(editor.state.selection);
  if (selected) {
    return chain().command(({
      tr
    }) => {
      const current = selectedList(tr.selection);
      if (!current) return false;
      const {
        list,
        depth
      } = current;
      if (list.type.name === listTypeName) return outdentList(tr);
      const listType = tr.doc.type.schema.nodes[listTypeName];
      const itemType = tr.doc.type.schema.nodes[itemTypeName];
      const items = children(list).map(item => item.type === itemType ? item : itemType.create(itemAttrs, item.content));
      replaceList(tr, tr.selection.$from.before(depth), list, [listType.create(list.attrs, items)]);
      return true;
    }).run();
  }
  // Do not flatten a selection that crosses nested-list parents.
  let crossesList = false;
  editor.state.doc.nodesBetween(editor.state.selection.from, editor.state.selection.to, node => {
    if (['listItem', 'checkboxItem'].includes(node.type.name)) crossesList = true;
  });
  if (crossesList) return false;
  const {
    doc: docBefore,
    selection: selBefore
  } = editor.state;
  const nativeAnchor = tiptapPosToNativePos(docBefore, selBefore.anchor);
  const nativeHead = tiptapPosToNativePos(docBefore, selBefore.head);
  return withPreservedAlignment(editor, chain(), c => c.clearNodes().command(({
    tr,
    state
  }) => {
    const listType = state.schema.nodes[listTypeName];
    const itemType = state.schema.nodes[itemTypeName];
    if (!listType || !itemType) {
      return false;
    }
    const {
      $from,
      $to
    } = state.selection;
    const range = $from.blockRange($to);
    if (!range) {
      return false;
    }
    const listItems = [];
    for (let i = range.startIndex; i < range.endIndex; i++) {
      const block = range.parent.child(i);
      listItems.push(itemType.create(itemAttrs, Fragment.from(block.copy(block.content))));
    }
    if (listItems.length === 0) {
      return false;
    }
    const list = listType.create(null, Fragment.from(listItems));
    tr.replaceWith(range.start, range.end, list);
    const docAfter = tr.doc;
    const pmAnchor = nativePosToTiptapPos(docAfter, nativeAnchor);
    const pmHead = nativePosToTiptapPos(docAfter, nativeHead);
    tr.setSelection(TextSelection.between(docAfter.resolve(pmAnchor), docAfter.resolve(pmHead)));
    return true;
  }));
}
//# sourceMappingURL=applyWrappingListToSelection.js.map