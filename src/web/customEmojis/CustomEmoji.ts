import { Node as TiptapNode } from '@tiptap/core';
import type { Node } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { closeHistory, isHistoryTransaction } from '@tiptap/pm/history';
import type { CustomEmoji, EnrichedTextInputProps } from '../../types';

const NAME = 'customEmoji';
const TOKEN =
  /(?<![\p{L}\p{M}\p{N}_]):[a-z0-9][a-z0-9_-]{0,63}:(?![\p{L}\p{M}\p{N}_])/gu;
export const customEmojiKey = new PluginKey('customEmojis');
type Options = {
  getCatalog: () => readonly CustomEmoji[];
  onError: NonNullable<EnrichedTextInputProps['onCustomEmojiError']>;
};

/** Expands emoji atoms when checking shortcode boundaries in a text block. */
export const emojiSourceText = (node: Node): string =>
  node.textBetween(0, node.content.size, '\n\n', (leaf) =>
    leaf.type.name === NAME ? leaf.attrs.shortcode : '\ufffc'
  );

export const CustomEmojiNode = TiptapNode.create<Options>({
  name: NAME,
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,
  addOptions: () => ({ getCatalog: () => [], onError: () => {} }),
  addAttributes: () => ({ shortcode: { default: '' }, uri: { default: '' } }),
  // Only text enters the schema. Image URLs are resolved from the caller's catalog.
  parseHTML: () => [],
  renderHTML: ({ node }) => [
    'span',
    { 'data-custom-emoji': '' },
    node.attrs.shortcode,
  ],
  renderText: ({ node }) => node.attrs.shortcode,
  addKeyboardShortcuts() {
    const remove = (backward: boolean) => {
      const { state, view } = this.editor;
      let { from, to } = state.selection;
      if (from === to) {
        const adjacent = backward
          ? state.selection.$from.nodeBefore
          : state.selection.$from.nodeAfter;
        if (adjacent?.type.name !== NAME) return false;
        if (backward) from--;
        else to++;
      } else {
        let containsEmoji = false;
        state.doc.nodesBetween(from, to, (node) => {
          if (node.type.name === NAME) containsEmoji = true;
        });
        if (!containsEmoji) return false;
      }
      view.dispatch(closeHistory(state.tr).delete(from, to).scrollIntoView());
      view.dispatch(closeHistory(this.editor.state.tr));
      return true;
    };
    return { Backspace: () => remove(true), Delete: () => remove(false) };
  },
  addNodeView() {
    const reported = new Set<string>();
    return ({ node }) => {
      const dom = document.createElement('span');
      dom.contentEditable = 'false';
      dom.dataset.customEmoji = node.attrs.shortcode;
      const img = document.createElement('img');
      img.alt = node.attrs.shortcode;
      img.title = node.attrs.shortcode;
      img.draggable = false;
      img.style.cssText =
        'width:1.25em;height:1.25em;object-fit:contain;vertical-align:-0.25em;display:inline-block';
      img.onerror = () => {
        dom.textContent = node.attrs.shortcode;
        const key = JSON.stringify([node.attrs.shortcode, node.attrs.uri]);
        if (!reported.has(key)) {
          reported.add(key);
          this.options.onError({
            shortcode: node.attrs.shortcode,
            uri: node.attrs.uri,
          });
        }
      };
      img.src = node.attrs.uri;
      dom.append(img);
      return { dom, ignoreMutation: () => true };
    };
  },
  addProseMirrorPlugins() {
    const editor = this.editor;
    const getCatalog = this.options.getCatalog;
    return [
      new Plugin({
        key: customEmojiKey,
        state: {
          init: () => false,
          apply: (tr, suppressed) =>
            isHistoryTransaction(tr)
              ? true
              : tr.docChanged &&
                  !tr.getMeta(customEmojiKey) &&
                  !tr.getMeta('appendedTransaction')
                ? false
                : suppressed,
        },
        props: {
          handleDOMEvents: {
            compositionend: () => {
              setTimeout(() => {
                if (!editor.isDestroyed && !editor.view.composing)
                  editor.view.dispatch(
                    editor.state.tr.setMeta(customEmojiKey, true)
                  );
              }, 0);
              return false;
            },
          },
        },
        appendTransaction(transactions, _old, state) {
          if (editor.view.composing) return null;
          const refresh =
            transactions.some((tr) => tr.getMeta(customEmojiKey)) ||
            transactions.some(isHistoryTransaction);
          if (!refresh && !transactions.some((tr) => tr.docChanged))
            return null;
          const catalog = new Map(
            getCatalog().map((emoji) => [emoji.shortcode, emoji.uri])
          );
          const tr = state.tr;
          const suppressed = customEmojiKey.getState(state);
          state.doc.descendants((block, blockPos) => {
            if (!block.isTextblock) return true;
            const source = emojiSourceText(block);
            const recognized = new Set(
              [...source.matchAll(TOKEN)].map((match) => match.index)
            );
            const $block = state.doc.resolve(blockPos + 1);
            const inCodeBlock = Array.from(
              { length: $block.depth + 1 },
              (_, depth) => $block.node(depth)
            ).some((ancestor) => ancestor.type.name === 'codeBlock');
            let sourceOffset = 0;
            block.forEach((node, offset) => {
              const text = node.isText
                ? node.text!
                : node.type.name === NAME
                  ? (node.attrs.shortcode as string)
                  : '\ufffc';
              const blocked =
                inCodeBlock ||
                block.type.spec.code ||
                node.marks.some(
                  (mark) =>
                    mark.type.name === 'code' ||
                    (mark.type.name === 'mention' &&
                      mark.attrs.indicator !== ':')
                );
              const marks = node.marks.filter(
                (mark) => mark.type.name !== 'mention'
              );
              const start = blockPos + 1 + offset;
              if (node.type.name === NAME) {
                const uri = catalog.get(text);
                if (blocked || !uri || !recognized.has(sourceOffset)) {
                  tr.replaceWith(
                    tr.mapping.map(start),
                    tr.mapping.map(start + 1),
                    state.schema.text(text, marks)
                  );
                } else if (uri !== node.attrs.uri) {
                  tr.setNodeMarkup(
                    tr.mapping.map(start),
                    undefined,
                    { shortcode: text, uri },
                    marks
                  );
                }
              } else if (node.isText && !blocked && !suppressed) {
                for (const match of text.matchAll(TOKEN)) {
                  const uri = catalog.get(match[0]);
                  if (!uri || !recognized.has(sourceOffset + match.index))
                    continue;
                  const from = start + match.index;
                  tr.replaceWith(
                    tr.mapping.map(from),
                    tr.mapping.map(from + match[0].length),
                    state.schema.nodes[NAME]!.create(
                      { shortcode: match[0], uri },
                      null,
                      marks
                    )
                  );
                }
              }
              sourceOffset += text.length;
            });
            return false;
          });
          if (!tr.steps.length) return null;
          tr.setMeta(customEmojiKey, true);
          if (refresh) tr.setMeta('addToHistory', false);
          return tr;
        },
      }),
    ];
  },
});
