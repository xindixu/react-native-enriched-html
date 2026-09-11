import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { EnrichedTextInput } from '../EnrichedTextInput';

// `act` warns unless the environment opts in; these tests drive react-dom
// directly rather than through a testing library that sets this for them.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type TEditorHost = HTMLElement & { editor?: { destroy: () => void } };

let container: HTMLDivElement | null = null;
let root: Root | null = null;

const renderWithHeadingSize = (fontSize: number) => {
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  }
  act(() => {
    root?.render(<EnrichedTextInput htmlStyle={{ h1: { fontSize } }} />);
  });
};

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  container = null;
  root = null;
});

describe('EnrichedTextInput with a destroyed editor', () => {
  it('does not touch commands after the editor is destroyed', () => {
    renderWithHeadingSize(30);

    const host = container?.querySelector<TEditorHost>('.ProseMirror');
    expect(host?.editor).toBeDefined();
    act(() => host?.editor?.destroy());

    // Revealing a hidden subtree re-mounts its effects against the values of
    // the last render, so the effects run again holding the destroyed editor.
    // A changed `htmlStyle` reproduces that re-run without React's reveal path,
    // which a test cannot drive.
    expect(() => renderWithHeadingSize(31)).not.toThrow();
  });
});
