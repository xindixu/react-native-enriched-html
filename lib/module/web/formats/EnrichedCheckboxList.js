"use strict";

import { TaskList } from '@tiptap/extension-list';
import { applyWrappingListToSelection } from "./applyWrappingListToSelection.js";
import { withPreservedAlignment } from "./formatRules.js";
export const EnrichedCheckboxList = TaskList.extend({
  name: 'checkboxList',
  addOptions() {
    return {
      itemTypeName: 'checkboxItem',
      HTMLAttributes: {}
    };
  },
  addCommands() {
    return {
      toggleCheckboxList: checked => {
        return ({
          editor,
          chain
        }) => {
          if (editor.isActive('checkboxList')) {
            return withPreservedAlignment(editor, chain(), c => c.clearNodes().setParagraph());
          }
          return applyWrappingListToSelection(editor, chain, 'checkboxList', 'checkboxItem', {
            checked
          });
        };
      }
    };
  },
  addKeyboardShortcuts() {
    return {};
  }
});
//# sourceMappingURL=EnrichedCheckboxList.js.map