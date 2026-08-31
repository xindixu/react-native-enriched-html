export type AutolinkRangeInWord = {
    start: number;
    endExclusive: number;
    text: string;
};
export declare function findAutolinkRangesInWord(word: string, linkRegex: RegExp | undefined): readonly AutolinkRangeInWord[];
//# sourceMappingURL=autolinkRegex.d.ts.map