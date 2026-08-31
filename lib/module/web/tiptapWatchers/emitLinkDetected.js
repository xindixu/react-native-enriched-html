"use strict";

function isSamePayload(a, b) {
  return a.text === b.text && a.url === b.url && a.start === b.start && a.end === b.end;
}
export function emitLinkDetected(state, next) {
  const prev = state.lastEmitted;
  if (prev && isSamePayload(prev, next)) return;
  state.lastEmitted = next;
  state.onLinkDetected?.(next);
}
//# sourceMappingURL=emitLinkDetected.js.map