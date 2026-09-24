import { Editor, type JSONContent } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import History from '@tiptap/extension-history';
import { EnrichedTextAlign } from '../EnrichedTextAlign';
import { EnrichedListItem } from '../EnrichedListItem';
import { EnrichedCheckboxItem } from '../EnrichedCheckboxItem';
import { EnrichedOrderedList } from '../EnrichedOrderedList';
import { EnrichedUnorderedList } from '../EnrichedUnorderedList';
import { EnrichedCheckboxList } from '../EnrichedCheckboxList';

const p = (text = ''): JSONContent => ({
  type: 'paragraph',
  ...(text ? { content: [{ type: 'text', text }] } : {}),
});
const list = (type: string, ...items: JSONContent[]): JSONContent => ({
  type,
  ...(type === 'orderedList' ? { attrs: { start: 1, type: null } } : {}),
  content: items,
});
const item = (
  text: string,
  children: JSONContent[] = [],
  checked?: boolean
): JSONContent => ({
  type: checked === undefined ? 'listItem' : 'checkboxItem',
  ...(checked === undefined ? {} : { attrs: { checked } }),
  content: [p(text), ...children],
});
let editor: Editor;
const load = (...content: JSONContent[]) => {
  editor = new Editor({
    extensions: [
      Document,
      Paragraph,
      Text,
      History,
      EnrichedListItem,
      EnrichedCheckboxItem,
      EnrichedOrderedList,
      EnrichedUnorderedList,
      EnrichedCheckboxList,
    ],
    content: { type: 'doc', content },
  });
};
const select = (text: string, end?: string, offset = 0) => {
  const positions: Record<string, number> = {};
  editor.state.doc.descendants((node, pos) => {
    if (node.isTextblock) positions[node.textContent] = pos + 1;
  });
  editor.commands.setTextSelection({
    from: positions[text]! + offset,
    to: positions[end ?? text]! + offset,
  });
};
const key = (name: string, shiftKey = false) => {
  const event = new KeyboardEvent('keydown', {
    key: name,
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  editor.view.dom.dispatchEvent(event);
  return event.defaultPrevented;
};
const shape = () => editor.getJSON().content;
afterEach(() => editor.destroy());
beforeAll(() => {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
});

test.each(['unorderedList', 'orderedList', 'checkboxList'])(
  '%s indents and outdents sibling selections with descendants',
  (type) => {
    const checked = type === 'checkboxList' ? false : undefined;
    const child = list('orderedList', item('child'));
    load(
      list(
        type,
        item('a', [], checked),
        item('b', [child], checked),
        item('c', [], checked)
      )
    );
    select('b', 'c');
    expect(key('Tab')).toBe(true);
    expect(shape()).toEqual([
      list(
        type,
        item(
          'a',
          [list(type, item('b', [child], checked), item('c', [], checked))],
          checked
        )
      ),
    ]);
    expect(key('Tab', true)).toBe(true);
    expect(shape()).toEqual([
      list(
        type,
        item('a', [], checked),
        item('b', [child], checked),
        item('c', [], checked)
      ),
    ]);
  }
);

test('failed indent and incompatible-parent selections leave Tab available', () => {
  load(
    list(
      'unorderedList',
      item('a', [list('orderedList', item('child'))]),
      item('b')
    )
  );
  select('a');
  expect(key('Tab')).toBe(false);
  select('child', 'b');
  const before = shape();
  expect(key('Tab')).toBe(false);
  expect(shape()).toEqual(before);
});

test('mixed-type outdent joins the parent list and preserves checked descendants', () => {
  const child = list('checkboxList', item('child', [], true));
  load(
    list(
      'checkboxList',
      item(
        'parent',
        [list('orderedList', item('a', [child]), item('tail'))],
        true
      )
    )
  );
  select('a');
  expect(key('Tab', true)).toBe(true);
  expect(shape()).toEqual([
    list(
      'checkboxList',
      item('parent', [], true),
      item('a', [child, list('orderedList', item('tail'))], false)
    ),
  ]);
});

test('top-level outdent retains children and supports undo', () => {
  const child = list('checkboxList', item('child', [], true));
  load(list('unorderedList', item('a', [child]), item('b')));
  const before = shape();
  select('a');
  expect(key('Tab', true)).toBe(true);
  expect(shape()).toEqual([p('a'), child, list('unorderedList', item('b'))]);
  expect(editor.commands.undo()).toBe(true);
  expect(shape()).toEqual(before);
});

test('empty nested Enter continues the same level', () => {
  load(list('unorderedList', item('a', [list('unorderedList', item(''))])));
  select('');
  expect(key('Enter')).toBe(true);
  expect(shape()).toEqual([
    list(
      'unorderedList',
      item('a', [list('unorderedList', item(''), item(''))])
    ),
  ]);
});

test('checkbox split resets completion and retains child lists', () => {
  const child = list('orderedList', item('child'));
  load(list('checkboxList', item('abcd', [child], true)));
  select('abcd', undefined, 2);
  expect(key('Enter')).toBe(true);
  expect(shape()).toEqual([
    list('checkboxList', item('ab', [], true), item('cd', [child], false)),
  ]);
});

test('Backspace at a mixed child start lifts exactly one level', () => {
  load(
    list(
      'unorderedList',
      item('a', [list('checkboxList', item('b', [], true))])
    )
  );
  select('b');
  expect(key('Backspace')).toBe(true);
  expect(shape()).toEqual([list('unorderedList', item('a'), item('b'))]);
});

test('toggles target the nearest list and preserve descendant check states', () => {
  const child = list('checkboxList', item('child', [], true));
  load(
    list('orderedList', item('a', [list('unorderedList', item('b', [child]))]))
  );
  select('b');
  expect(editor.commands.toggleOrderedList()).toBe(true);
  expect(shape()).toEqual([
    list('orderedList', item('a', [list('orderedList', item('b', [child]))])),
  ]);
  expect(editor.commands.toggleCheckboxList(true)).toBe(true);
  expect(shape()).toEqual([
    list(
      'orderedList',
      item('a', [list('checkboxList', item('b', [child], false))])
    ),
  ]);
});

test('can() checks do not mutate nested content or selection', () => {
  load(list('unorderedList', item('a'), item('b')));
  select('b');
  const before = shape();
  const selection = editor.state.selection;
  expect(editor.can().toggleCheckboxList(false)).toBe(true);
  expect(shape()).toEqual(before);
  expect(editor.state.selection).toEqual(selection);
});

test('selection crossing parent and child is not flattened by a toggle', () => {
  load(
    list(
      'unorderedList',
      item('a', [list('orderedList', item('child'))]),
      item('b')
    )
  );
  select('a', 'child');
  const before = shape();
  expect(editor.commands.toggleCheckboxList(false)).toBe(false);
  expect(shape()).toEqual(before);
});

test('three-level mixed indentation preserves the caret and redo', () => {
  load(
    list(
      'checkboxList',
      item(
        'a',
        [
          list(
            'orderedList',
            item('b', [list('unorderedList', item('c'), item('d'))])
          ),
        ],
        true
      )
    )
  );
  select('d', undefined, 1);
  expect(key('Tab')).toBe(true);
  expect(editor.state.selection.$from.parent.textContent).toBe('d');
  expect(editor.state.selection.$from.parentOffset).toBe(1);
  const after = shape();
  editor.commands.undo();
  editor.commands.redo();
  expect(shape()).toEqual(after);
});

test('Backspace away from item start does not outdent', () => {
  load(list('unorderedList', item('ab')));
  select('ab', undefined, 1);
  expect(key('Backspace')).toBe(false);
});

test('ordinary paragraphs keep browser Tab navigation', () => {
  load(p('a'));
  select('a');
  expect(key('Tab')).toBe(false);
  expect(key('Tab', true)).toBe(false);
});

test('list conversion and top-level outdent retain inherited alignment', () => {
  load(list('unorderedList', item('a')));
  const options = editor.options;
  editor.destroy();
  editor = new Editor({
    ...options,
    extensions: [...options.extensions, EnrichedTextAlign],
  });
  select('a');
  editor.commands.setTextAlign('right');
  expect(editor.commands.toggleCheckboxList(false)).toBe(true);
  expect(editor.state.doc.firstChild!.attrs.textAlign).toBe('right');
  expect(key('Tab', true)).toBe(true);
  expect(editor.state.doc.firstChild!.attrs.textAlign).toBe('right');
  expect(editor.state.selection.$from.parent.textContent).toBe('a');
});

test.each([{ isComposing: true }, { keyCode: 229 }])(
  'IME confirmation does not split a list (%j)',
  (flags) => {
    load(list('unorderedList', item('a')));
    select('a');
    const before = shape();
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
      ...flags,
    });
    editor.view.dom.dispatchEvent(event);
    expect(shape()).toEqual(before);
    expect(event.defaultPrevented).toBe(false);
  }
);

test.each(['unorderedList', 'orderedList', 'checkboxList'])(
  '%s indentation commands each have an independent undo step',
  (type) => {
    load(p(''));
    const checked = type === 'checkboxList' ? false : undefined;
    editor.commands.setContent({
      type: 'doc',
      content: [list(type, item('a', [], checked), item('b', [], checked))],
    });
    select('b');
    const original = shape();
    expect(key('Tab')).toBe(true);
    const indented = shape();
    expect(key('Tab', true)).toBe(true);
    expect(shape()).toEqual(original);
    expect(editor.commands.undo()).toBe(true);
    expect(shape()).toEqual(indented);
    expect(editor.commands.undo()).toBe(true);
    expect(shape()).toEqual(original);
    expect(editor.commands.redo()).toBe(true);
    expect(shape()).toEqual(indented);
  }
);
