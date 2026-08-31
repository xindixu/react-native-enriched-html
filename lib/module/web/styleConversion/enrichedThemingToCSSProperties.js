"use strict";

import { toColor } from "./toColor.js";
function applySelectionColor(extra, selectionColor) {
  const selectionCss = toColor(selectionColor);
  if (selectionCss) extra['--et-selection-color'] = selectionCss;
  return extra;
}
export function enrichedInputThemingToCSSProperties({
  cursorColor,
  placeholderTextColor,
  selectionColor
}) {
  const extra = {};
  const caret = toColor(cursorColor);
  if (caret) extra.caretColor = caret;
  const placeholderCss = toColor(placeholderTextColor);
  if (placeholderCss) extra['--et-placeholder-text-color'] = placeholderCss;
  return applySelectionColor(extra, selectionColor);
}
export function enrichedTextThemingToCSSProperties({
  selectionColor,
  selectable
}) {
  const extra = {};
  if (selectable !== undefined) extra.userSelect = selectable ? 'text' : 'none';
  return applySelectionColor(extra, selectionColor);
}
//# sourceMappingURL=enrichedThemingToCSSProperties.js.map