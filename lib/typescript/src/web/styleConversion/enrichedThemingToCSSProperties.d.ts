import type { CSSProperties } from 'react';
import type { ColorValue } from 'react-native';
export interface EnrichedInputThemingColors {
    cursorColor?: ColorValue;
    placeholderTextColor?: ColorValue;
    selectionColor?: ColorValue;
}
export declare function enrichedInputThemingToCSSProperties({ cursorColor, placeholderTextColor, selectionColor, }: EnrichedInputThemingColors): CSSProperties;
export interface EnrichedTextThemingOptions {
    selectionColor?: ColorValue;
    selectable?: boolean;
}
export declare function enrichedTextThemingToCSSProperties({ selectionColor, selectable, }: EnrichedTextThemingOptions): CSSProperties;
//# sourceMappingURL=enrichedThemingToCSSProperties.d.ts.map