import type { Editor } from '@tiptap/core';
import type { HtmlStyle } from '../../types.js';
type ChainedCommands = ReturnType<Editor['chain']>;
export declare function isAnyParagraphFormatActive(editor: Editor): boolean;
export declare function isLinkBlocked(editor: Editor): boolean;
export declare function isImageBlocked(editor: Editor): boolean;
export declare function isFormatBlocked(tiptapName: string, editor: Editor, htmlStyle: Required<HtmlStyle>): boolean;
export declare function toggleParagraphFormat(isActive: () => boolean, deactivate: () => boolean, activate: (c: ChainedCommands) => ChainedCommands, chain: () => ChainedCommands, editor: Editor): boolean;
export declare function getCurrentAlignment(editor: Editor): string | null;
export declare function withPreservedAlignment(editor: Editor, chain: ChainedCommands, mutateChain: (c: ChainedCommands) => ChainedCommands): boolean;
export {};
//# sourceMappingURL=formatRules.d.ts.map