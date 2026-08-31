export declare const ELLIPSIS_CHAR = "\u2026";
export declare const BLOCK_TAGS: Set<string>;
export type LineMark = {
    node: Node;
    index: number;
};
export declare function createSandbox(container: HTMLDivElement, finalHtml: string): {
    sandbox: HTMLDivElement;
    computedStyle: CSSStyleDeclaration;
    lineTolerance: number;
};
export declare const walkerFilter: NodeFilter;
export declare function getBlockParent(node: Node | null, sandbox: HTMLElement): Element | null;
export declare function innermostEmptyBlock(el: Element): Element;
export declare function removeAndCleanUp(nd: Node, sandbox: HTMLElement): void;
export declare function splitTextNode(textNode: Text, index: number): Text;
export declare function splitAtMark(mark: LineMark): Node;
export declare function removeBlankTextAndPrune(textNode: Text, sandbox: HTMLElement): void;
export declare function fitsWithin(sandbox: HTMLElement, fromNode: Node, targetBottom: number, tolerance: number): boolean;
export type LineScan = {
    lineStarts: LineMark[];
    lineBottoms: number[];
    lastLine: number;
};
export declare function scanLines(sandbox: HTMLElement, lineTolerance: number, onMeasure?: (info: {
    currentLine: number;
    node: Node;
    index: number;
    nodeX: number;
}) => void): LineScan;
export declare function removeAfterTarget(targetNode: Node, sandbox: HTMLElement): void;
export declare function eatBackwardUntilFits(sandbox: HTMLElement, lastBottom: number | null, lineTolerance: number, withEllipsis: boolean): void;
export declare function eatForwardUntilFits(sandbox: HTMLElement, ellipsisNode: Node, checkFits: () => boolean): void;
export declare function markLastListOrdinal(lastLineNode: Node, sandbox: HTMLElement): void;
export declare function restoreLastListOrdinal(sandbox: HTMLElement): void;
//# sourceMappingURL=utils.d.ts.map