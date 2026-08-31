import { type RefObject } from 'react';
import type { EnrichedTextHtmlStyle, EnrichedTextProps } from '../../';
import type { TextStyle } from 'react-native';
type EllipsizeMode = NonNullable<EnrichedTextProps['ellipsizeMode']>;
interface EllipsizeOptions {
    containerRef: RefObject<HTMLDivElement | null>;
    finalHtml: string;
    ellipsizeMode: EllipsizeMode;
    numberOfLines: number;
    setClampedHtml: (html: string) => void;
    style?: TextStyle;
    htmlStyle?: EnrichedTextHtmlStyle;
}
export declare function useEllipsizeMode({ containerRef, finalHtml, ellipsizeMode, numberOfLines, setClampedHtml, style, htmlStyle, }: EllipsizeOptions): void;
export {};
//# sourceMappingURL=useEllipsizeMode.d.ts.map