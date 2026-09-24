import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Editor } from '@tiptap/react';
import { closeHistory } from '@tiptap/pm/history';
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
let editor: Editor;
const ref = createRef<EnrichedTextInputInstance>();
const catalog = [
  { shortcode: ':party:', uri: 'https://example.com/party.gif' },
];
const render = async (props: Partial<EnrichedTextInputProps> = {}) => {
  act(() => {
    root.render(
      <EnrichedTextInput
        ref={ref}
        customEmojis={catalog}
        defaultValue="<p></p>"
        {...props}
      />
    );
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  editor = (
    container.querySelector('.ProseMirror') as HTMLElement & { editor: Editor }
  ).editor;
};
const image = () => container.querySelector('img');
const insert = (text: string) =>
  act(() => {
    editor.view.dispatch(closeHistory(editor.state.tr).insertText(text));
  });
beforeAll(() => {
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () =>
    document.createElement('span').getBoundingClientRect();
});
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it('renders restored shortcodes atomically while exporting shortcode HTML and rendered offsets', async () => {
  await render({ defaultValue: '<p><b>Hello :party:</b></p><p>after</p>' });
  expect(image()?.alt).toBe(':party:');
  expect(editor.state.doc.firstChild?.childCount).toBe(2);
  expect(await ref.current!.getHTML()).toBe(
    '<html><p><b>Hello :party:</b></p><p>after</p></html>'
  );
  act(() => ref.current!.setSelection(8, 10));
  expect(
    editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to
    )
  ).toBe('af');
});

it('converts typed shortcode as one undoable insertion and restores it on redo', async () => {
  await render();
  insert(':party:');
  expect(image()).not.toBeNull();
  act(() => editor.commands.undo());
  expect(image()).toBeNull();
  expect(editor.getText()).toBe('');
  act(() => editor.commands.redo());
  expect(image()).not.toBeNull();
});

it('leaves undo-restored literal shortcodes alone on selection changes', async () => {
  await render({ customEmojis: [] });
  insert(':party:');
  insert('x');
  await render();
  act(() => editor.commands.undo());
  expect(image()).toBeNull();
  act(() => editor.commands.setTextSelection(1));
  expect(image()).toBeNull();
});

it.each([
  'x:party:',
  ':party:x',
  'é:party:',
  ':party:字',
  ':unknown:',
  '<code>:party:</code>',
  '<codeblock><p>:party:</p></codeblock>',
  '<mention text="@:party:" indicator="@">@:party:</mention>',
])('keeps excluded shortcode text literal: %s', async (content) => {
  await render({
    defaultValue: content.startsWith('<codeblock>')
      ? content
      : `<p>${content}</p>`,
  });
  expect(image()).toBeNull();
});

it('updates catalog images and falls back to text without resetting selection', async () => {
  await render({ defaultValue: '<p>:party: end</p>' });
  act(() => ref.current!.setSelection(1, 1));
  await render({
    defaultValue: '<p>:party: end</p>',
    customEmojis: [{ ...catalog[0]!, uri: 'https://example.com/new.gif' }],
  });
  expect(image()?.src).toBe('https://example.com/new.gif');
  expect(editor.state.selection.from).toBe(2);
  await render({ defaultValue: '<p>:party: end</p>', customEmojis: [] });
  expect(image()).toBeNull();
  expect(editor.getText()).toBe(':party: end');
  expect(editor.state.selection.from).toBe(8);
});

it('counts expanded shortcode length at the input limit', async () => {
  const exceeded = jest.fn();
  await render({ maxPlainTextLength: 7, onMaxLengthExceeded: exceeded });
  insert(':party:');
  expect(image()).not.toBeNull();
  insert('x');
  expect(exceeded).toHaveBeenCalled();
  expect(await ref.current!.getHTML()).toContain(':party:');
  expect(editor.state.doc.child(0).childCount).toBe(1);
});

it('reports failed images once per URI and displays the shortcode', async () => {
  const onCustomEmojiError = jest.fn();
  await render({ defaultValue: '<p>:party: :party:</p>', onCustomEmojiError });
  const images = [...container.querySelectorAll('[data-custom-emoji] img')];
  expect(images).toHaveLength(2);
  act(() => images.forEach((img) => img.dispatchEvent(new Event('error'))));
  expect(onCustomEmojiError).toHaveBeenCalledTimes(1);
  expect(onCustomEmojiError).toHaveBeenCalledWith(catalog[0]);
  expect(container.querySelector('.ProseMirror')?.textContent).toBe(
    ':party: :party:'
  );
});

it('hydrates a late catalog without adding an undo step', async () => {
  await render({ customEmojis: [] });
  insert(':party:');
  await render();
  expect(image()).not.toBeNull();
  act(() => editor.commands.undo());
  expect(editor.getText()).toBe('');
});

it('does not restore a stale image when undo follows catalog removal', async () => {
  await render();
  insert(':party:');
  insert(' end');
  await render({ customEmojis: [] });
  act(() => editor.commands.undo());
  expect(image()).toBeNull();
  expect(editor.getText()).toBe(':party:');
});

it('deletes an emoji atomically and restores it with undo', async () => {
  await render();
  insert(':party:');
  act(() => editor.view.dispatch(closeHistory(editor.state.tr)));
  act(() => editor.commands.deleteRange({ from: 1, to: 2 }));
  expect(editor.getText()).toBe('');
  act(() => editor.commands.undo());
  expect(image()?.alt).toBe(':party:');
});

it('expands an emoji when editing invalidates its word boundary', async () => {
  await render({ defaultValue: '<p>:party:</p>' });
  act(() => editor.commands.setTextSelection(2));
  insert('x');
  expect(image()).toBeNull();
  expect(editor.getText()).toBe(':party:x');
  expect(editor.state.selection.from).toBe(9);
});

it('keeps code literal when formatting an existing emoji', async () => {
  await render({ defaultValue: '<p>:party:</p>' });
  act(() => editor.commands.setTextSelection({ from: 1, to: 2 }));
  act(() => editor.commands.toggleCode());
  expect(image()).toBeNull();
  expect(await ref.current!.getHTML()).toContain('<code>:party:</code>');
});

it('completes a custom emoji mention and preserves surrounding formatting', async () => {
  await render({ mentionIndicators: [':'], defaultValue: '<p><b>Hi</b></p>' });
  act(() => editor.commands.setTextSelection(3));
  act(() => editor.view.dom.focus());
  insert(' :par');
  expect(editor.getText()).toBe('Hi :par');
  act(() =>
    ref.current!.setMention(':', ':party:', { 'data-mention-kind': 'emoji' })
  );
  expect(image()?.alt).toBe(':party:');
  expect(await ref.current!.getHTML()).toContain('<b>Hi :party: </b>');
});

it('copies shortcode text and pastes it as an emoji without uploading an image', async () => {
  const onPasteImages = jest.fn();
  await render({ defaultValue: '<p><b>:party:</b></p>', onPasteImages });
  act(() => editor.commands.setTextSelection({ from: 1, to: 2 }));
  const clipboard = editor.view.serializeForClipboard(
    editor.state.selection.content()
  );
  expect(clipboard.text).toBe(':party:');
  expect(clipboard.dom.innerHTML).not.toContain('<img');
  act(() => ref.current!.setValue('<p></p>'));
  act(() =>
    editor.view.pasteHTML(
      clipboard.dom.innerHTML,
      new Event('paste') as ClipboardEvent
    )
  );
  expect(image()?.alt).toBe(':party:');
  expect(await ref.current!.getHTML()).toContain('<b>:party:</b>');
  expect(onPasteImages).not.toHaveBeenCalled();
});

it('defers emoji replacement until composition ends', async () => {
  await render();
  act(() =>
    editor.view.dom.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true })
    )
  );
  insert(':party:');
  expect(image()).toBeNull();
  act(() =>
    editor.view.dom.dispatchEvent(
      new CompositionEvent('compositionend', { bubbles: true })
    )
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 25));
  });
  expect(image()?.alt).toBe(':party:');
});

it('emits one rendered placeholder per emoji in text events', async () => {
  const texts: string[] = [];
  await render({
    onChangeText: (event) => texts.push(event.nativeEvent.value),
  });
  insert(':party: :party:');
  expect(texts.at(-1)).toBe('\ufffc \ufffc');
});

it.each(['Backspace', 'Delete'])(
  'undo restores an emoji removed with %s',
  async (key) => {
    await render();
    insert(':party:');
    act(() => editor.commands.setTextSelection(key === 'Delete' ? 1 : 2));
    act(() =>
      editor.view.dom.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      )
    );
    expect(image()).toBeNull();
    act(() => editor.commands.undo());
    expect(image()?.alt).toBe(':party:');
  }
);
