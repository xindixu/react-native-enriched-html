"use strict";

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Mapping } from '@tiptap/pm/transform';
import { emitLinkDetected } from "../../tiptapWatchers/emitLinkDetected.js";
import { tiptapPosToNativePos } from "../../nativeMappers/positionMapping.js";
import { findAutolinkRangesInWord } from "./autolinkRegex.js";
const WHITESPACE_RE = /\S+/g;
function removeAutoLinksInRange(doc, tr, linkType, from, to) {
  if (from >= to) return;
  doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText) return true;
    const link = linkType.isInSet(node.marks);
    if (link?.attrs.auto === true) {
      tr.removeMark(Math.max(from, pos), Math.min(to, pos + node.nodeSize), linkType);
    }
    return false;
  });
}
function rangeHasManualLink(doc, linkType, from, to) {
  let found = false;
  doc.nodesBetween(from, to, node => {
    if (found) return false;
    if (!node.isText) return true;
    const link = linkType.isInSet(node.marks);
    if (link && link.attrs.auto !== true) found = true;
    return false;
  });
  return found;
}
function rangeHasExactAutoLink(doc, linkType, from, to, href) {
  let hasExact = true;
  let hasText = false;
  doc.nodesBetween(from, to, node => {
    if (!hasExact) return false;
    if (!node.isText) return true;
    hasText = true;
    const link = linkType.isInSet(node.marks);
    if (!link || link.attrs.auto !== true || link.attrs.href !== href) {
      hasExact = false;
    }
    return false;
  });
  return hasText && hasExact;
}
function extractRuns(block, blockStartPos, schema) {
  const runs = [];
  let current = null;
  block.forEach((child, offset) => {
    const eligibleText = child.isText && child.text && !schema.marks.code?.isInSet(child.marks) && !schema.marks.mention?.isInSet(child.marks);
    if (eligibleText) {
      if (!current) {
        current = {
          text: '',
          startPos: blockStartPos + 1 + offset
        };
      }
      current.text += child.text;
      return;
    }
    if (current) {
      runs.push(current);
      current = null;
    }
  });
  if (current) runs.push(current);
  return runs;
}
function getDirtyBlocks(doc, transactions) {
  const mapping = new Mapping();
  for (const tr of transactions) mapping.appendMapping(tr.mapping);
  const blocks = new Map();
  const docSize = doc.content.size;
  mapping.maps.forEach((stepMap, i) => {
    const rest = mapping.slice(i + 1);
    stepMap.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
      const from = Math.max(0, rest.map(newStart, -1) - 1);
      const to = Math.min(docSize, rest.map(newEnd, 1) + 1);
      doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name === 'codeBlock') return false;
        if (node.inlineContent && !blocks.has(pos)) {
          blocks.set(pos, node);
          return false;
        }
        return true;
      });
    });
  });
  return Array.from(blocks, ([pos, node]) => ({
    pos,
    node
  }));
}
export const AutolinkPlugin = Extension.create({
  name: 'autolinkDetector',
  addOptions() {
    return {
      getLinkEmitter: () => {
        throw new Error('AutolinkPlugin.configure({ getLinkEmitter }) is required');
      }
    };
  },
  addProseMirrorPlugins() {
    return [new Plugin({
      key: new PluginKey('autolinkDetector'),
      appendTransaction: (transactions, _oldState, newState) => {
        if (!transactions.some(tr => tr.docChanged)) return null;
        const state = this.options.getLinkEmitter();
        if (!state || state.linkRegex === null) return null;
        const {
          schema,
          doc,
          tr
        } = newState;
        const linkType = schema.marks.link;
        if (!linkType) return null;
        const dirtyBlocks = getDirtyBlocks(doc, transactions);
        if (dirtyBlocks.length === 0) return null;
        const detected = [];
        for (const {
          node,
          pos
        } of dirtyBlocks) {
          const blockFrom = pos + 1;
          const blockTo = pos + node.nodeSize - 1;

          // find all valid links that should exist in this block
          const desiredLinks = [];
          for (const run of extractRuns(node, pos, schema)) {
            for (const match of run.text.matchAll(WHITESPACE_RE)) {
              const word = match[0];
              const wordStart = run.startPos + match.index;
              const wordEnd = wordStart + word.length;
              const ranges = findAutolinkRangesInWord(word, state.linkRegex);
              const fullMatch = ranges.some(r => r.start === 0 && r.endExclusive === word.length);
              if (!fullMatch) continue;
              if (rangeHasManualLink(doc, linkType, wordStart, wordEnd)) continue;
              desiredLinks.push({
                start: wordStart,
                end: wordEnd,
                href: word
              });
            }
          }
          let lastPos = blockFrom;
          for (const link of desiredLinks) {
            // strip auto links in the "gap" before this desired link
            removeAutoLinksInRange(doc, tr, linkType, lastPos, link.start);
            tr.addMark(link.start, link.end, linkType.create({
              href: link.href,
              auto: true
            }));
            const alreadyExisted = rangeHasExactAutoLink(doc, linkType, link.start, link.end, link.href);

            // don't emit if the link was not changed
            if (!alreadyExisted) {
              detected.push({
                text: link.href,
                url: link.href,
                start: tiptapPosToNativePos(doc, link.start),
                end: tiptapPosToNativePos(doc, link.end)
              });
            }
            lastPos = link.end;
          }

          // strip rest of the auto links that are now not desired
          removeAutoLinksInRange(doc, tr, linkType, lastPos, blockTo);
        }
        if (tr.steps.length === 0) return null;
        for (const event of detected) emitLinkDetected(state, event);
        return tr;
      }
    })];
  }
});
//# sourceMappingURL=index.js.map