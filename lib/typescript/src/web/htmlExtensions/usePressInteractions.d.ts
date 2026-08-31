import { type RefObject } from 'react';
import type { OnLinkPressEvent, OnMentionPressEvent } from '../../types.js';
type OnLinkPressEventRef = RefObject<((event: OnLinkPressEvent) => void) | undefined>;
type OnMentionPressEventRef = RefObject<((event: OnMentionPressEvent) => void) | undefined>;
export declare function usePressInteractions(containerRef: RefObject<HTMLDivElement | null>, onLinkPressRef: OnLinkPressEventRef, onMentionPressRef: OnMentionPressEventRef): void;
export {};
//# sourceMappingURL=usePressInteractions.d.ts.map