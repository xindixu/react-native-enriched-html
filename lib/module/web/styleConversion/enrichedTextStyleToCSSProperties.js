"use strict";

import { enrichedBaseStyleToCSSProperties } from "./enrichedBaseStyleToCSSProperties.js";
import { toColor } from "./toColor.js";
export function enrichedTextStyleToCSSProperties(style) {
  const css = {
    ...enrichedBaseStyleToCSSProperties(style, {
      scrollEnabled: false
    }),
    // Text-only properties
    // textAlign: RN 'auto' has no CSS equivalent
    textAlign: style.textAlign !== 'auto' ? style.textAlign : undefined,
    textTransform: style.textTransform,
    textDecorationLine: style.textDecorationLine,
    textDecorationStyle: style.textDecorationStyle,
    textDecorationColor: toColor(style.textDecorationColor),
    textShadow: resolveTextShadow(style),
    // userSelect: RN 'contain' has no CSS equivalent
    userSelect: style.userSelect !== 'contain' ? style.userSelect : undefined,
    fontVariant: Array.isArray(style.fontVariant) ? style.fontVariant.join(' ') : undefined,
    // writingDirection: RN 'auto' has no CSS equivalent
    direction: style.writingDirection !== 'auto' ? style.writingDirection : undefined,
    // verticalAlign: RN 'auto' has no CSS equivalent
    verticalAlign: style.verticalAlign !== 'auto' ? style.verticalAlign : undefined
  };
  return Object.fromEntries(Object.entries(css).filter(([, v]) => v !== undefined));
}
function resolveTextShadow(style) {
  const {
    textShadowColor,
    textShadowOffset,
    textShadowRadius
  } = style;
  if (textShadowColor == null && textShadowOffset == null && textShadowRadius == null) {
    return undefined;
  }
  const x = textShadowOffset?.width ?? 0;
  const y = textShadowOffset?.height ?? 0;
  const blur = textShadowRadius ?? 0;
  const color = toColor(textShadowColor);
  const offset = `${x}px ${y}px ${blur}px`;
  return color ? `${offset} ${color}` : offset;
}
//# sourceMappingURL=enrichedTextStyleToCSSProperties.js.map