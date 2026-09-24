"use strict";

import { OrderedList } from '@tiptap/extension-list';
import { applyWrappingListToSelection } from "./applyWrappingListToSelection.js";
export const EnrichedOrderedList = OrderedList.extend({
  addInputRules() {
    return [];
  },
  addKeyboardShortcuts() {
    return {};
  },
  addCommands() {
    return {
      toggleOrderedList: () => ({
        editor,
        chain
      }) => {
        return applyWrappingListToSelection(editor, chain, 'orderedList', 'listItem');
      }
    };
  }
});
//# sourceMappingURL=EnrichedOrderedList.js.map