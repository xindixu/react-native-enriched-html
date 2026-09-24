import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { ListItem, OrderedList } from '@tiptap/extension-list';
import { OrderedListMarkerWidthPlugin } from '../pmPlugins/OrderedListMarkerWidthPlugin';

test('nested ordered lists size their own markers', () => {
  const editor = new Editor({
    extensions: [
      Document,
      Paragraph,
      Text,
      OrderedList,
      ListItem,
      OrderedListMarkerWidthPlugin,
    ],
    content:
      '<ol><li><p>parent</p><ol>' +
      '<li><p>child</p></li>'.repeat(10) +
      '</ol></li></ol>',
  });
  try {
    const lists = editor.view.dom.querySelectorAll('ol');
    expect(lists[0]?.style.getPropertyValue('--et-ol-digits')).toBe('1');
    expect(lists[1]?.style.getPropertyValue('--et-ol-digits')).toBe('2');
  } finally {
    editor.destroy();
  }
});
