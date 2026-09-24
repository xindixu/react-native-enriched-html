import { Node as TiptapNode } from '@tiptap/core';
import type { Node } from '@tiptap/pm/model';
import { PluginKey } from '@tiptap/pm/state';
import type { CustomEmoji, EnrichedTextInputProps } from '../../types.js';
export declare const customEmojiKey: PluginKey<any>;
type Options = {
    getCatalog: () => readonly CustomEmoji[];
    onError: NonNullable<EnrichedTextInputProps['onCustomEmojiError']>;
};
/** Expands emoji atoms when checking shortcode boundaries in a text block. */
export declare const emojiSourceText: (node: Node) => string;
export declare const CustomEmojiNode: TiptapNode<Options, any>;
export {};
//# sourceMappingURL=CustomEmoji.d.ts.map