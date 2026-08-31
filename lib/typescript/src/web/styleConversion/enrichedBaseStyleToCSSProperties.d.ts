import type { CSSProperties } from 'react';
import type { EnrichedInputStyle } from '../../types.js';
import type { TextStyle } from 'react-native';
export interface StyleConversionExtraOptions {
    scrollEnabled?: boolean;
}
export declare function enrichedBaseStyleToCSSProperties(style: EnrichedInputStyle | TextStyle, extraOptions?: StyleConversionExtraOptions): CSSProperties;
//# sourceMappingURL=enrichedBaseStyleToCSSProperties.d.ts.map