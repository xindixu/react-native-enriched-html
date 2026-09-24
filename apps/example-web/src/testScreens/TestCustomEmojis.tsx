import { useRef, useState } from 'react';
import {
  EnrichedTextInput,
  type EnrichedTextInputInstance,
} from 'react-native-enriched-html';

const inputStyle = { fontSize: 20, minHeight: 80 };
const emojis = [{ shortcode: ':party:', uri: '/custom-emoji.gif' }];
export function TestCustomEmojis() {
  const ref = useRef<EnrichedTextInputInstance>(null);
  const [enabled, setEnabled] = useState(true);
  const [html, setHtml] = useState('');
  const [failures, setFailures] = useState(0);
  return (
    <main>
      <h1>Custom emojis</h1>
      <button onClick={() => setEnabled((value) => !value)}>
        Toggle catalog
      </button>
      <button
        onClick={() =>
          ref.current?.setValue('<p><b>Hi :party:</b></p><p>after</p>')
        }
      >
        Restore
      </button>
      <button onClick={() => ref.current?.setSelection(4, 4)}>
        After emoji
      </button>
      <button
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => ref.current?.setMention(':', ':party:')}
      >
        Complete emoji
      </button>
      <EnrichedTextInput
        ref={ref}
        customEmojis={enabled ? emojis : []}
        mentionIndicators={[':']}
        onCustomEmojiError={() => setFailures((count) => count + 1)}
        onChangeHtml={(event) => setHtml(event.nativeEvent.value)}
        style={inputStyle}
      />
      <pre data-testid="html">{html}</pre>
      <output data-testid="failures">{failures}</output>
    </main>
  );
}
