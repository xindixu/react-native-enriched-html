import { type LinkOptions } from '@tiptap/extension-link';
import type { Editor } from '@tiptap/react';
export declare const EnrichedLink: import("@tiptap/core").Mark<LinkOptions & {
    getLinkRegex: () => RegExp | null | undefined;
}, any>;
export declare function removeLink(editor: Editor, start: number, end: number): void;
export declare function setLink(editor: Editor, start: number, end: number, text: string, url: string): void;
//# sourceMappingURL=EnrichedLink.d.ts.map