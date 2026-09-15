import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Editor } from '@tiptap/react';
import type {
  EnrichedTextInputInstance,
  EnrichedTextInputProps,
} from '../../types';
import { EnrichedTextInput } from '../EnrichedTextInput';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const ref = createRef<EnrichedTextInputInstance>();
let editor: Editor;
let requests: { requestId: string; html: string; text: string }[];
const onPaste = (event: {
  nativeEvent: { requestId: string; html: string; text: string };
}) => {
  requests.push(event.nativeEvent);
};
const render = (props: Partial<EnrichedTextInputProps> = {}) => {
  act(() =>
    root.render(
      <EnrichedTextInput
        ref={ref}
        defaultValue="<p>hello world</p>"
        onPaste={onPaste}
        {...props}
      />
    )
  );
  editor = (
    container.querySelector('.ProseMirror') as HTMLElement & { editor: Editor }
  ).editor;
};
const paste = (
  html = '<table><tr><td>A</td><td>B</td></tr></table>',
  text = 'A\tB',
  clipboard: Partial<DataTransfer> = {}
) => {
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: {
      getData: (type: string) => (type === 'text/html' ? html : text),
      items: [],
      files: [],
      types: ['text/html', 'text/plain'],
      ...clipboard,
    },
  });
  act(() => editor.view.dom.dispatchEvent(event));
  return event;
};
const complete = async (id: string, html: string) => {
  let applied: boolean | undefined;
  await act(async () => {
    applied = await ref.current!.completePaste(id, html);
  });
  return applied;
};
beforeAll(() => {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () =>
    document.createElement('span').getBoundingClientRect();
});
beforeEach(async () => {
  requests = [];
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  render();
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(editor.getText()).toBe('hello world');
  act(() => editor.commands.setTextSelection({ from: 7, to: 12 }));
  act(() => editor.view.dom.focus());
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it('delivers original clipboard content without inserting it', () => {
  const event = paste();
  expect(event.defaultPrevented).toBe(true);
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({
    html: '<table><tr><td>A</td><td>B</td></tr></table>',
    text: 'A\tB',
  });
  expect(editor.getText()).toBe('hello world');
});

it('replaces the captured selection once and supports undo and redo', async () => {
  paste();
  const id = requests[0]!.requestId;
  expect(await complete(id, '<p><b>A</b> B</p>')).toBe(true);
  expect(editor.getText()).toBe('hello A B');
  expect(editor.getHTML()).toContain('<b>A</b>');
  expect(await complete(id, '<p>duplicate</p>')).toBe(false);
  act(() => editor.commands.undo());
  expect(editor.getText()).toBe('hello world');
  act(() => editor.commands.redo());
  expect(editor.getText()).toBe('hello A B');
});

it.each([
  'typing',
  'formatting',
  'selection',
  'blur',
  'replacement',
  'disabled',
  'callback removed',
])('rejects a request after %s', async (change) => {
  paste();
  const id = requests[0]!.requestId;
  act(() => {
    if (change === 'typing') editor.commands.insertContent('!');
    if (change === 'formatting') editor.commands.toggleBold();
    if (change === 'selection') {
      editor.commands.setTextSelection(1);
      editor.commands.setTextSelection({ from: 7, to: 12 });
    }
    if (change === 'blur') editor.view.dom.blur();
    if (change === 'replacement') ref.current!.setValue('<p>hello world</p>');
  });
  if (change === 'disabled') render({ editable: false });
  if (change === 'callback removed') render({ onPaste: undefined });
  const before = editor.getHTML();
  expect(await complete(id, '<p>stale</p>')).toBe(false);
  expect(editor.getHTML()).toBe(before);
});

it('lets a newer request supersede an earlier paste', async () => {
  paste('', 'first');
  paste('', 'second');
  expect(await complete(requests[0]!.requestId, '<p>first</p>')).toBe(false);
  expect(await complete(requests[1]!.requestId, '<p>second</p>')).toBe(true);
  expect(editor.getText()).toBe('hello second');
});

it('cancels empty completion without deleting the selection', async () => {
  paste();
  expect(await complete(requests[0]!.requestId, '')).toBe(false);
  expect(editor.getText()).toBe('hello world');
});

it('keeps default paste when no callback is provided', () => {
  render({ onPaste: undefined });
  paste('<b>normal</b>', 'normal');
  expect(requests).toHaveLength(0);
  expect(editor.getText()).toBe('hello normal');
});

it('does not apply a completion to a destroyed editor', async () => {
  paste();
  const handle = ref.current!;
  const id = requests[0]!.requestId;
  act(() => editor.destroy());
  expect(await handle.completePaste(id, '<p>stale</p>')).toBe(false);
});

it('keeps paste separate from typing before and after it in undo history', async () => {
  act(() => editor.commands.insertContent('before'));
  paste('', 'paste');
  expect(await complete(requests[0]!.requestId, '<p>paste</p>')).toBe(true);
  act(() => editor.commands.insertContent('after'));
  act(() => editor.commands.undo());
  expect(editor.getText()).toBe('hello beforepaste');
  act(() => editor.commands.undo());
  expect(editor.getText()).toBe('hello before');
  act(() => editor.commands.redo());
  expect(editor.getText()).toBe('hello beforepaste');
});

it.each(['items', 'files', 'html'])(
  'keeps default image paste from %s without a callback',
  async (source) => {
    const file = new File(['image'], 'image.png', { type: 'image/png' });
    const clipboard =
      source === 'items'
        ? { items: [{ kind: 'file', type: file.type, getAsFile: () => file }] }
        : source === 'files'
          ? { files: [file] }
          : {};
    const html =
      '<p>caption<img src="https://example.com/image.png" alt="picture"></p>';
    render({ onPaste: undefined });
    paste(html, 'caption', clipboard as Partial<DataTransfer>);
    const defaultHtml = editor.getHTML();
    expect(defaultHtml).toContain('src="https://example.com/image.png"');
    act(() => {
      ref.current!.setValue('<p>hello world</p>');
      editor.commands.setTextSelection({ from: 7, to: 12 });
    });
    render();
    paste();
    const requestId = requests[0]!.requestId;
    requests = [];
    paste(html, 'caption', clipboard as Partial<DataTransfer>);
    expect(requests).toHaveLength(0);
    expect(editor.getHTML()).toBe(defaultHtml);
    expect(await complete(requestId, '<p>stale</p>')).toBe(false);
  }
);

it.each(['items', 'files'])(
  'leaves a binary-only image paste from %s unconsumed without an image callback',
  (source) => {
    const file = new File(['image'], 'image.png', { type: 'image/png' });
    const clipboard =
      source === 'items'
        ? { items: [{ kind: 'file', type: file.type, getAsFile: () => file }] }
        : { files: [file] };
    const event = paste('', '', clipboard as unknown as Partial<DataTransfer>);
    expect(requests).toHaveLength(0);
    expect(event.defaultPrevented).toBe(false);
    expect(editor.getText()).toBe('hello world');
  }
);

it.each([
  ['exact boundary', '<p>12345</p>', true, 'hello 12345'],
  ['one over', '<p>123456</p>', false, 'hello world'],
  ['UTF-16 emoji', '<p>😀😀😀</p>', false, 'hello world'],
  ['combining marks', '<p>ééé</p>', false, 'hello world'],
  ['block separators', '<p>123</p><p>45</p>', false, 'hello world'],
] as const)(
  'limits controlled paste: %s',
  async (_, html, allowed, expected) => {
    const exceeded = jest.fn();
    render({ maxPlainTextLength: 11, onMaxLengthExceeded: exceeded });
    paste();
    const beforeSelection = editor.state.selection.toJSON();
    expect(await complete(requests[0]!.requestId, html)).toBe(allowed);
    expect(editor.getText()).toBe(expected);
    if (!allowed) {
      expect(editor.state.selection.toJSON()).toEqual(beforeSelection);
      expect(exceeded).toHaveBeenCalledTimes(1);
      expect(exceeded.mock.calls[0]![0].nativeEvent).toEqual({ maxLength: 11 });
    }
  }
);

it('rejects ordinary paste entirely, including selected text', () => {
  render({ onPaste: undefined, maxPlainTextLength: 11 });
  const selection = editor.state.selection.toJSON();
  paste('<b>123456</b>', '123456');
  expect(editor.getText()).toBe('hello world');
  expect(editor.state.selection.toJSON()).toEqual(selection);
});

it('rejects typing before committing an editor transaction', () => {
  render({ maxPlainTextLength: 11 });
  act(() => editor.commands.setTextSelection(12));
  const doc = editor.state.doc;
  act(() => editor.commands.insertContent('!'));
  expect(editor.state.doc).toBe(doc);
});

it('keeps oversized hydration, formatting, and deletion available', () => {
  render({ maxPlainTextLength: 3 });
  expect(editor.getText()).toBe('hello world');
  act(() => ref.current!.setValue('<p>oversized</p>'));
  expect(editor.getText()).toBe('oversized');
  act(() => {
    editor.commands.selectAll();
    editor.commands.toggleBold();
  });
  expect(editor.getHTML()).toContain('<b>oversized</b>');
  act(() => editor.commands.deleteRange({ from: 1, to: 2 }));
  expect(editor.getText()).toBe('versized');
  act(() => editor.commands.setTextSelection(9));
  act(() => editor.commands.insertContent('extra'));
  expect(editor.getText()).toBe('versized');
});

it.each([undefined, -1])(
  'keeps the default unlimited (%s)',
  (maxPlainTextLength) => {
    render({ onPaste: undefined, maxPlainTextLength });
    paste('<p>unlimited text</p>', 'unlimited text');
    expect(editor.getText()).toBe('hello unlimited text');
  }
);

it('prevents cancelable text input before the browser changes DOM', () => {
  render({ maxPlainTextLength: 11 });
  act(() => editor.commands.setTextSelection(12));
  const event = new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    inputType: 'insertText',
    data: '!',
  });
  act(() => editor.view.dom.dispatchEvent(event));
  expect(event.defaultPrevented).toBe(true);
  expect(editor.getText()).toBe('hello world');
});

it('repairs noncancelable composition DOM without committing oversized text', async () => {
  render({ maxPlainTextLength: 11 });
  act(() => editor.commands.setTextSelection(12));
  await act(async () => {
    editor.view.dom.querySelector('p')!.firstChild!.textContent =
      'hello world界';
    editor.view.dom.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        inputType: 'insertCompositionText',
        data: '界',
        isComposing: true,
      })
    );
    editor.view.dom.dispatchEvent(
      new CompositionEvent('compositionend', { bubbles: true, data: '界' })
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
  expect(editor.getText()).toBe('hello world');
  expect(editor.view.dom.textContent).toBe('hello world');
});

it('accepts 64000 units and rejects the next unit without a change event', () => {
  const changed = jest.fn();
  render({ maxPlainTextLength: 64000, onChangeText: changed });
  act(() => {
    ref.current!.setValue('<p>' + 'a'.repeat(63999) + '</p>');
    editor.commands.setTextSelection(64000);
    editor.commands.insertContent('a');
  });
  expect(editor.getText()).toHaveLength(64000);
  changed.mockClear();
  act(() => editor.commands.insertContent('a'));
  expect(editor.getText()).toHaveLength(64000);
  expect(changed).not.toHaveBeenCalled();
});

it('counts zero-width input for paste and repeated typing', async () => {
  render({ maxPlainTextLength: 11 });
  paste();
  expect(
    await complete(requests[0]!.requestId, '<p>' + '\u200b'.repeat(12) + '</p>')
  ).toBe(false);
  expect(editor.getText()).toBe('hello world');
  act(() => editor.commands.setTextSelection(12));
  for (let index = 0; index < 3; index++) {
    act(() => editor.commands.insertContent('\u200b'));
  }
  expect(editor.getText()).toBe('hello world');
});

it('rejects a newline at capacity and allows it to replace selected text', () => {
  render({ maxPlainTextLength: 11 });
  act(() => editor.commands.setTextSelection(12));
  act(() => editor.commands.splitBlock());
  expect(editor.getHTML()).toBe('<p>hello world</p>');
  act(() => editor.commands.setTextSelection({ from: 11, to: 12 }));
  act(() => editor.commands.splitBlock());
  expect(editor.getHTML()).toBe('<p>hello worl</p><p></p>');
});
