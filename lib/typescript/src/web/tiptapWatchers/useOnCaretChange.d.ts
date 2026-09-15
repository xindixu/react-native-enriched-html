import { type RefObject } from 'react';
import type { Editor } from '@tiptap/core';
import type { EnrichedTextInputProps } from '../../types.js';
/** Reports caret geometry relative to the input's outer view after layout. */
export declare function useOnCaretChange(editor: Editor | null, container: RefObject<HTMLElement | null>, onCaretChange: EnrichedTextInputProps['onCaretChange']): void;
//# sourceMappingURL=useOnCaretChange.d.ts.map