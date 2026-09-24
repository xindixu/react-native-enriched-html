"use strict";

import { TaskItem } from '@tiptap/extension-list';
import { listBackspace, listEnter, listTab } from "./listKeyboard.js";
import { ITEM_CONTENT } from "./listStructure.js";
export const EnrichedCheckboxItem = TaskItem.extend({
  name: 'checkboxItem',
  addOptions() {
    return {
      nested: true,
      HTMLAttributes: {},
      taskListTypeName: 'checkboxList'
    };
  },
  content: ITEM_CONTENT,
  addKeyboardShortcuts() {
    return {
      'Enter': ({
        editor
      }) => listEnter(editor, 'checkboxItem'),
      'Backspace': ({
        editor
      }) => listBackspace(editor, 'checkboxItem'),
      'Tab': ({
        editor
      }) => listTab(editor),
      'Shift-Tab': ({
        editor
      }) => listTab(editor, true)
    };
  }
});
//# sourceMappingURL=EnrichedCheckboxItem.js.map