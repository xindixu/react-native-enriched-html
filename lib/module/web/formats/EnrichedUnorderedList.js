"use strict";

import { BulletList } from '@tiptap/extension-list';
import { applyWrappingListToSelection } from "./applyWrappingListToSelection.js";
import { withPreservedAlignment } from "./formatRules.js";
export const EnrichedUnorderedList = BulletList.extend({
  name: 'unorderedList',
  addInputRules() {
    return [];
  },
  addKeyboardShortcuts() {
    return {};
  },
  addCommands() {
    return {
      toggleUnorderedList: () => ({
        editor,
        chain
      }) => {
        if (editor.isActive('unorderedList')) {
          return withPreservedAlignment(editor, chain(), c => c.clearNodes().setParagraph());
        }
        return applyWrappingListToSelection(editor, chain, 'unorderedList', 'listItem');
      }
    };
  }
});
//# sourceMappingURL=EnrichedUnorderedList.js.map