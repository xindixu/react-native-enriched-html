import { type Editor } from '@tiptap/core';
export declare function listTab(editor: Editor, outdent?: boolean): boolean;
/** Empty items continue at the current depth rather than leaving their list. */
export declare function listEnter(editor: Editor, itemName: string): boolean;
export declare function listBackspace(editor: Editor, itemName: string): boolean;
//# sourceMappingURL=listKeyboard.d.ts.map