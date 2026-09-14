import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { NativeProps } from '../../spec/EnrichedTextInputNativeComponent';
import type { EnrichedTextInputInstance } from '../../types';
import { EnrichedTextInput } from '../../native/EnrichedTextInput';

jest.mock('react-native', () => ({ processColor: () => 0 }));

let mockProps: NativeProps;
const mockComplete = jest.fn();
jest.mock('../../spec/EnrichedTextInputNativeComponent', () => ({
  __esModule: true,
  default: function NativeInput(props: NativeProps & { ref: unknown }) {
    const React = require('react');
    React.useImperativeHandle(props.ref, () => ({}));
    mockProps = props;
    return null;
  },
  Commands: { completePaste: (...args: unknown[]) => mockComplete(...args) },
}));
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
const ref = createRef<EnrichedTextInputInstance>();
beforeEach(() => {
  mockComplete.mockReset();
  container = document.createElement('div');
  root = createRoot(container);
  act(() => root.render(<EnrichedTextInput ref={ref} onPaste={() => {}} />));
});
afterEach(() => act(() => root.unmount()));

it.each([true, false])(
  'returns the native acknowledgement (%s), without duplicate dispatch',
  async (applied) => {
    const result = ref.current!.completePaste('paste-1', '<p>hello</p>');
    expect(mockProps.processPaste).toBe(true);
    expect(mockComplete).toHaveBeenCalledWith(
      expect.anything(),
      'paste-1',
      '<p>hello</p>'
    );
    expect(
      await ref.current!.completePaste('paste-1', '<p>duplicate</p>')
    ).toBe(false);
    expect(mockComplete).toHaveBeenCalledTimes(1);
    mockProps.onPasteComplete!({
      nativeEvent: { requestId: 'paste-1', applied },
    } as never);
    expect(await result).toBe(applied);
  }
);

it('settles pending completion when the component unmounts', async () => {
  const handle = ref.current!;
  const result = handle.completePaste('paste-1', '<p>hello</p>');
  act(() => root.render(null));
  expect(await result).toBe(false);
  expect(await handle.completePaste('paste-2', '<p>late</p>')).toBe(false);
  expect(mockComplete).toHaveBeenCalledTimes(1);
});

it('settles command dispatch failure without leaving a pending completion', async () => {
  mockComplete.mockImplementationOnce(() => {
    throw new Error('view unavailable');
  });
  expect(await ref.current!.completePaste('paste-1', '<p>hello</p>')).toBe(
    false
  );
  mockComplete.mockImplementationOnce(() => {
    mockProps.onPasteComplete!({
      nativeEvent: { requestId: 'paste-1', applied: false },
    } as never);
  });
  expect(await ref.current!.completePaste('paste-1', '')).toBe(false);
});
