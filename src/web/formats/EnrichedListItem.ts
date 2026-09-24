import { Plugin } from '@tiptap/pm/state';
import { ListItem } from '@tiptap/extension-list';
import { listBackspace, listEnter, listTab } from './listKeyboard';
import { ITEM_CONTENT, selectedList } from './listStructure';

export const EnrichedListItem = ListItem.extend({
  content: ITEM_CONTENT,
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDOMEvents: {
            keydown: (view, event) =>
              (event.isComposing || event.keyCode === 229) &&
              selectedList(view.state.selection) !== null,
          },
        },
      }),
    ];
  },
  addKeyboardShortcuts() {
    return {
      'Enter': ({ editor }) => listEnter(editor, 'listItem'),
      'Backspace': ({ editor }) => listBackspace(editor, 'listItem'),
      'Tab': ({ editor }) => listTab(editor),
      'Shift-Tab': ({ editor }) => listTab(editor, true),
    };
  },
});
