"use strict";

import { OrderedList } from '@tiptap/extension-list';
import { applyWrappingListToSelection } from "./applyWrappingListToSelection.js";
import { withPreservedAlignment } from "./formatRules.js";
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
        if (editor.isActive('orderedList')) {
          return withPreservedAlignment(editor, chain(), c => c.clearNodes().setParagraph());
        }
        return applyWrappingListToSelection(editor, chain, 'orderedList', 'listItem');
      }
    };
  }
});
//# sourceMappingURL=EnrichedOrderedList.js.map