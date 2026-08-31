import { Extension } from '@tiptap/core';
import type { HtmlStyle } from '../../types.js';
declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        stripBoldInStyledHeadings: {
            normalizeBoldInStyledHeadings: () => ReturnType;
        };
    }
}
interface StripBoldInStyledHeadingsPluginOptions {
    getHtmlStyle: () => Required<HtmlStyle>;
}
export declare const StripBoldInStyledHeadingsPlugin: Extension<StripBoldInStyledHeadingsPluginOptions, any>;
export {};
//# sourceMappingURL=StripBoldInStyledHeadingsPlugin.d.ts.map