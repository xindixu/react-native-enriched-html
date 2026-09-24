"use strict";

import { Fragment } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import { lineStartBackspace } from "./wrappedBlockKeyboard.js";
import { children, LIST_NAMES, outdentList, replaceList, selectedList } from "./listStructure.js";
export function listTab(editor, outdent = false) {
  if (editor.view.composing) return false;
  return editor.commands.command(({
    tr,
    dispatch
  }) => {
    const selected = selectedList(tr.selection);
    if (!selected || !outdent && !selected.from) return false;
    if (!dispatch) return true;
    if (outdent) return outdentList(tr);
    const {
      depth,
      list,
      from,
      to
    } = selected;
    const items = children(list);
    const previous = items[from - 1];
    const content = children(previous);
    const last = content[content.length - 1];
    const nested = Fragment.from(items.slice(from, to));
    if (last.type === list.type) content[content.length - 1] = last.copy(last.content.append(nested));else content.push(list.type.create(list.attrs, nested));
    items.splice(from - 1, to - from + 1, previous.copy(Fragment.from(content)));
    replaceList(tr, tr.selection.$from.before(depth), list, [list.copy(Fragment.from(items))]);
    return true;
  });
}

/** Empty items continue at the current depth rather than leaving their list. */
export function listEnter(editor, itemName) {
  const selected = selectedList(editor.state.selection);
  if (editor.view.composing || !selected || selected.list.child(selected.from).type.name !== itemName) return false;
  const {
    selection
  } = editor.state;
  if (selection.empty && selection.$from.parent.content.size === 0) {
    return editor.commands.command(({
      tr
    }) => {
      const $from = tr.selection.$from;
      const item = $from.node(selected.depth + 1);
      const pos = $from.after(selected.depth + 1);
      tr.insert(pos, item.type.create(null, $from.parent.type.create($from.parent.attrs)));
      tr.setSelection(TextSelection.create(tr.doc, pos + 2));
      return true;
    });
  }
  return editor.chain().splitListItem(itemName, itemName === 'checkboxItem' ? {
    checked: false
  } : undefined).run();
}
export function listBackspace(editor, itemName) {
  if (editor.view.composing) return false;
  const selected = selectedList(editor.state.selection);
  if (selected && selected.list.child(selected.from).type.name !== itemName) return false;
  return lineStartBackspace(editor, {
    isActive: () => selected !== null,
    lift: () => listTab(editor, true),
    shouldJoinBefore: before => before != null && LIST_NAMES.includes(before)
  });
}
//# sourceMappingURL=listKeyboard.js.map