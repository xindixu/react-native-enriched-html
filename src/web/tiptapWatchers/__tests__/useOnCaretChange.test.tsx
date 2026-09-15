import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { useOnCaretChange } from '../useOnCaretChange';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test('reports editor-local caret geometry after selection, scroll, and resize; stops on unmount', () => {
  jest.useFakeTimers();
  const host = document.createElement('div');
  document.body.append(host);
  const editor = new Editor({
    extensions: [Document, Paragraph, Text],
    content: '<p>Hello</p>',
  });
  const callback = jest.fn();
  let resize: () => void = () => {};
  const disconnect = jest.fn();
  const originalObserver = globalThis.ResizeObserver;
  globalThis.ResizeObserver = jest.fn().mockImplementation((fn) => {
    resize = fn;
    return { observe: jest.fn(), disconnect };
  });
  jest.spyOn(host, 'getBoundingClientRect').mockReturnValue({
    left: 100,
    top: 200,
    right: 400,
    bottom: 400,
  } as DOMRect);
  const coords = jest
    .spyOn(editor.view, 'coordsAtPos')
    .mockReturnValue({ left: 140, right: 141, top: 230, bottom: 250 });
  const root = createRoot(host);
  function Harness() {
    useOnCaretChange(editor, { current: host }, callback);
    return null;
  }
  act(() => {
    root.render(<Harness />);
  });
  act(() => {
    jest.runOnlyPendingTimers();
  });
  expect(callback.mock.lastCall?.[0].nativeEvent).toEqual({
    x: 40,
    y: 30,
    width: 1,
    height: 20,
    visible: true,
  });

  coords.mockReturnValue({ left: 180, right: 181, top: 260, bottom: 280 });
  act(() => {
    editor.commands.setTextSelection(3);
    jest.runOnlyPendingTimers();
  });
  expect(callback.mock.lastCall?.[0].nativeEvent).toMatchObject({
    x: 80,
    y: 60,
  });

  coords.mockReturnValue({ left: 180, right: 181, top: 190, bottom: 210 });
  act(() => {
    host.dispatchEvent(new Event('scroll'));
    jest.runOnlyPendingTimers();
  });
  expect(callback.mock.lastCall?.[0].nativeEvent.visible).toBe(false);

  coords.mockReturnValue({ left: 180, right: 181, top: 220, bottom: 240 });
  act(() => {
    resize();
    jest.runOnlyPendingTimers();
  });
  expect(callback.mock.lastCall?.[0].nativeEvent).toMatchObject({
    y: 20,
    visible: true,
  });
  act(() => {
    editor.commands.setTextSelection({ from: 1, to: 3 });
    jest.runOnlyPendingTimers();
  });
  expect(callback.mock.lastCall?.[0].nativeEvent.visible).toBe(false);

  act(() => {
    root.unmount();
  });
  callback.mockClear();
  host.dispatchEvent(new Event('scroll'));
  jest.runOnlyPendingTimers();
  expect(callback).not.toHaveBeenCalled();
  expect(disconnect).toHaveBeenCalled();
  editor.destroy();
  host.remove();
  globalThis.ResizeObserver = originalObserver;
  jest.useRealTimers();
});
