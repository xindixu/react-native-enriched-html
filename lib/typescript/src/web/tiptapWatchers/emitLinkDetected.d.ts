import type { RefObject } from 'react';
import type { OnLinkDetected } from '../../types.js';
export interface LinkEmitterState {
    linkRegex?: RegExp | null;
    onLinkDetected?: (e: OnLinkDetected) => void;
    lastEmitted: OnLinkDetected | null;
}
export type LinkEmitterRef = RefObject<LinkEmitterState>;
export declare function emitLinkDetected(state: LinkEmitterState, next: OnLinkDetected): void;
//# sourceMappingURL=emitLinkDetected.d.ts.map