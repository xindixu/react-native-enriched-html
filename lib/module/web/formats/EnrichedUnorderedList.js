"use strict";

import { BulletList } from '@tiptap/extension-list';
import { applyWrappingListToSelection } from "./applyWrappingListToSelection.js";
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
        return applyWrappingListToSelection(editor, chain, 'unorderedList', 'listItem');
      }
    };
  }
});
//# sourceMappingURL=EnrichedUnorderedList.js.map