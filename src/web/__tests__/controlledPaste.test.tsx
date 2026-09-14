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
