import { Extension } from '@tiptap/core';
import type { TextShortcut, HtmlStyle } from '../../types.js';
export interface TextShortcutsPluginOptions {
    getTextShortcuts: () => TextShortcut[];
    getHtmlStyle: () => Required<HtmlStyle>;
}
export declare const TextShortcutsPlugin: Extension<TextShortcutsPluginOptions, any>;
//# sourceMappingURL=TextShortcutsPlugin.d.ts.map