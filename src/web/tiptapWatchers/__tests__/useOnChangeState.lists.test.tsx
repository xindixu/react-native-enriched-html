import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { ListItem, OrderedList, BulletList } from '@tiptap/extension-list';
import { useOnChangeState } from '../useOnChangeState';
import { DEFAULT_HTML_STYLE } from '../../../utils/defaultHtmlStyle';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test('only the innermost list type is active in mixed nesting', () => {
  const editor = new Editor({
    extensions: [
      Document,
      Paragraph,
      Text,
      OrderedList,
      ListItem,
      BulletList.extend({ name: 'unorderedList' }),
    ],
    content: '<ul><li><p>parent</p><ol><li><p>child</p></li></ol></li></ul>',
  });
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text === 'child')
      editor.commands.setTextSelection(pos);
  });
  const callback = jest.fn();
  const host = document.createElement('div');
  const root = createRoot(host);
  function Harness() {
    useOnChangeState(editor, DEFAULT_HTML_STYLE, callback);
    return null;
  }
  try {
    act(() => root.render(<Harness />));
    expect(callback.mock.lastCall?.[0].nativeEvent).toMatchObject({
      orderedList: { isActive: true },
      unorderedList: { isActive: false },
      checkboxList: { isActive: false },
    });
  } finally {
    act(() => root.unmount());
    editor.destroy();
  }
});
