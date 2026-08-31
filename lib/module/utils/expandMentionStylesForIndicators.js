"use strict";

import { isMentionStyleRecord } from "./isMentionStyleRecord.js";
export function expandMentionStylesForIndicators(mention, indicators, htmlStyleToMergeWith) {
  const out = {};
  for (const indicator of indicators) {
    out[indicator] = {
      ...htmlStyleToMergeWith.mention,
      ...(isMentionStyleRecord(mention) ? mention[indicator] ?? mention.default ?? {} : mention)
    };
  }
  return out;
}
//# sourceMappingURL=expandMentionStylesForIndicators.js.map