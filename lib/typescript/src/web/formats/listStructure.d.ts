import type { Node } from '@tiptap/pm/model';
import { type Selection, type Transaction } from '@tiptap/pm/state';
export declare const LIST_NAMES: string[];
export declare const ITEM_CONTENT = "paragraph (unorderedList | orderedList | checkboxList)*";
export declare const children: (node: Node) => Node[];
/** Only paragraphs belonging to sibling items may participate in one operation. */
export declare function selectedList(selection: Selection): {
    depth: number;
    list: Node;
    from: number;
    to: number;
} | null;
/** Structural edits reuse paragraphs, allowing anchor and head to follow their content. */
export declare function replaceList(tr: Transaction, pos: number, node: Node, replacement: Node[]): void;
export declare function outdentList(tr: Transaction): boolean;
//# sourceMappingURL=listStructure.d.ts.map