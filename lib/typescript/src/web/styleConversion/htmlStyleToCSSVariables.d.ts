import type { CSSProperties } from 'react';
import type { EnrichedTextHtmlStyle, HtmlStyle } from '../../types.js';
export declare function mergeWithDefaultHtmlStyle(htmlStyle?: HtmlStyle, htmlStyleToMergeWith?: HtmlStyle): Required<HtmlStyle>;
export declare function mergeWithDefaultEnrichedTextHtmlStyle(htmlStyle?: EnrichedTextHtmlStyle): Required<EnrichedTextHtmlStyle>;
export declare const ET_MENTION_CSS_VARS: {
    readonly color: (indicator: string) => string;
    readonly backgroundColor: (indicator: string) => string;
    readonly textDecorationLine: (indicator: string) => string;
};
export declare function htmlStyleToCSSVariables(htmlStyle: HtmlStyle): CSSProperties;
export declare const ET_MENTION_PRESS_CSS_VARS: {
    readonly pressColor: (indicator: string) => string;
    readonly pressBackgroundColor: (indicator: string) => string;
};
export declare function enrichedTextHtmlStyleToCSSVariables(htmlStyle: EnrichedTextHtmlStyle): CSSProperties;
//# sourceMappingURL=htmlStyleToCSSVariables.d.ts.map