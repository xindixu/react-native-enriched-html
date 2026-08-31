"use strict";

const FULL_URL_REGEX = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-z]{2,63}\b([-a-zA-Z0-9@:%_+.~#?&/=]*)/;
const WWW_REGEX = /www\.[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-z]{2,63}\b([-a-zA-Z0-9@:%_+.~#?&/=]*)/;
const BARE_REGEX = /[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-z]{2,63}\b([-a-zA-Z0-9@:%_+.~#?&/=]*)/;
const DEFAULT_AUTOLINK_SUBSTRING_PATTERN = `(?:${FULL_URL_REGEX.source})|(?:${WWW_REGEX.source})|(?:${BARE_REGEX.source})`;
function asGlobalRegex(re) {
  return re.global ? re : new RegExp(re.source, `${re.flags.replace(/g/g, '')}g`);
}

// URL-like substrings inside a single whitespace-delimited token (`\S+`),
export function findAutolinkRangesInWord(word, linkRegex) {
  const re = linkRegex ? asGlobalRegex(linkRegex) : new RegExp(DEFAULT_AUTOLINK_SUBSTRING_PATTERN, 'gi');
  const out = [];
  for (const m of word.matchAll(re)) {
    const text = m[0] ?? '';
    if (text.length === 0 || m.index === undefined) continue;
    const start = m.index;
    out.push({
      start,
      endExclusive: start + text.length,
      text
    });
  }
  return out;
}
//# sourceMappingURL=autolinkRegex.js.map