import type { SanitizationConfig } from '../../types.js';
export declare function prepareHtmlForTiptap(html: string, useHtmlNormalizer: boolean | undefined, sanitizationConfig?: SanitizationConfig): string;
export declare function normalizeHtmlFromTiptap(html: string, getSanitizationConfig: () => SanitizationConfig | undefined): string;
//# sourceMappingURL=tiptapHtmlNormalizer.d.ts.map