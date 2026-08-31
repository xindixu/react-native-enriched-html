"use strict";

import { DEFAULT_ENRICHED_TEXT_STYLE, DEFAULT_HTML_STYLE } from "../../utils/defaultHtmlStyle.js";
import { expandMentionStylesForIndicators } from "../../utils/expandMentionStylesForIndicators.js";
import { HEADING_TAGS } from "../formats/EnrichedHeading.js";
import { indicatorToMentionCssKey, MENTION_STYLE_DEFAULT_KEY } from "./mentionIndicatorCssKey.js";
import { toColor } from "./toColor.js";
import { isMentionStyleRecord } from "../../utils/isMentionStyleRecord.js";
export function mergeWithDefaultHtmlStyle(htmlStyle, htmlStyleToMergeWith = DEFAULT_HTML_STYLE) {
  const style = htmlStyle ?? {};
  const mentionMap = expandMentionStylesForIndicatorsIncludeDefault(style, htmlStyleToMergeWith);
  const converted = {
    ...style,
    mention: mentionMap
  };
  const merged = {
    ...htmlStyleToMergeWith
  };
  for (const key in converted) {
    if (key === 'mention') {
      merged[key] = {
        ...converted.mention
      };
      continue;
    }
    merged[key] = {
      ...htmlStyleToMergeWith[key],
      ...converted[key]
    };
  }
  return merged;
}
export function mergeWithDefaultEnrichedTextHtmlStyle(htmlStyle) {
  const style = htmlStyle ?? {};
  const merged = mergeWithDefaultHtmlStyle(style, DEFAULT_ENRICHED_TEXT_STYLE);
  const a = {
    ...DEFAULT_ENRICHED_TEXT_STYLE.a,
    ...style?.a
  };
  const mentionDefaults = DEFAULT_ENRICHED_TEXT_STYLE.mention;
  const passedMentionMap = htmlStyle?.mention;
  const mergedMentionMap = merged.mention;
  const mention = {};
  for (const indicator in mergedMentionMap) {
    mention[indicator] = {
      ...mentionDefaults,
      ...(isMentionStyleRecord(passedMentionMap) ? passedMentionMap[indicator] ?? passedMentionMap[MENTION_STYLE_DEFAULT_KEY] : passedMentionMap)
    };
  }
  return {
    ...merged,
    a,
    mention
  };
}
const ET_CSS_VARS = {
  codeColor: '--et-code-color',
  codeBgColor: '--et-code-bg-color',
  blockquoteBorderColor: '--et-blockquote-border-color',
  blockquoteBorderWidth: '--et-blockquote-border-width',
  blockquoteGapWidth: '--et-blockquote-gap-width',
  blockquoteColor: '--et-blockquote-color',
  codeblockBgColor: '--et-codeblock-bg-color',
  codeblockColor: '--et-codeblock-color',
  codeblockBorderRadius: '--et-codeblock-border-radius',
  linkColor: '--et-link-color',
  linkTextDecorationLine: '--et-link-text-decoration-line',
  ulBulletColor: '--et-ul-bullet-color',
  ulBulletSize: '--et-ul-bullet-size',
  ulMarginLeft: '--et-ul-margin-left',
  ulGapWidth: '--et-ul-gap-width',
  olMarginLeft: '--et-ol-margin-left',
  olGapWidth: '--et-ol-gap-width',
  olMarkerColor: '--et-ol-marker-color',
  olMarkerFontWeight: '--et-ol-marker-font-weight',
  checkboxBoxSize: '--et-checkbox-box-size',
  checkboxGapWidth: '--et-checkbox-gap-width',
  checkboxMarginLeft: '--et-checkbox-margin-left',
  checkboxBoxColor: '--et-checkbox-box-color'
};
export const ET_MENTION_CSS_VARS = {
  color: indicator => `--et-mention-${indicatorToMentionCssKey(indicator)}-color`,
  backgroundColor: indicator => `--et-mention-${indicatorToMentionCssKey(indicator)}-background-color`,
  textDecorationLine: indicator => `--et-mention-${indicatorToMentionCssKey(indicator)}-text-decoration-line`
};
function setColorVar(vars, name, value) {
  const c = toColor(value);
  if (c) vars[name] = c;
}
function setPxVar(vars, name, n) {
  if (n != null) vars[name] = `${n}px`;
}
function applyCodeVars(vars, code) {
  setColorVar(vars, ET_CSS_VARS.codeColor, code?.color);
  setColorVar(vars, ET_CSS_VARS.codeBgColor, code?.backgroundColor);
}
function applyHeadingVars(vars, htmlStyle) {
  for (const level of HEADING_TAGS) {
    const h = htmlStyle?.[level];
    if (h?.fontSize != null) vars[`--et-${level}-font-size`] = `${h.fontSize}px`;
    if (h?.bold != null) vars[`--et-${level}-font-weight`] = h.bold ? 'bold' : 'normal';
  }
}
function applyBlockquoteVars(vars, bq) {
  setColorVar(vars, ET_CSS_VARS.blockquoteBorderColor, bq?.borderColor);
  setPxVar(vars, ET_CSS_VARS.blockquoteBorderWidth, bq?.borderWidth);
  setPxVar(vars, ET_CSS_VARS.blockquoteGapWidth, bq?.gapWidth);
  setColorVar(vars, ET_CSS_VARS.blockquoteColor, bq?.color);
}
function applyCodeblockVars(vars, cb) {
  setColorVar(vars, ET_CSS_VARS.codeblockBgColor, cb?.backgroundColor);
  setColorVar(vars, ET_CSS_VARS.codeblockColor, cb?.color);
  setPxVar(vars, ET_CSS_VARS.codeblockBorderRadius, cb?.borderRadius);
}
function applyLinkVars(vars, anchor) {
  setColorVar(vars, ET_CSS_VARS.linkColor, anchor?.color);
  if (anchor?.textDecorationLine != null) {
    vars[ET_CSS_VARS.linkTextDecorationLine] = anchor.textDecorationLine;
  }
}
function applyUnorderedListVars(vars, ul) {
  setColorVar(vars, ET_CSS_VARS.ulBulletColor, ul?.bulletColor);
  setPxVar(vars, ET_CSS_VARS.ulBulletSize, ul?.bulletSize);
  setPxVar(vars, ET_CSS_VARS.ulMarginLeft, ul?.marginLeft);
  setPxVar(vars, ET_CSS_VARS.ulGapWidth, ul?.gapWidth);
}
function applyOrderedListVars(vars, ol) {
  setPxVar(vars, ET_CSS_VARS.olMarginLeft, ol?.marginLeft);
  setPxVar(vars, ET_CSS_VARS.olGapWidth, ol?.gapWidth);
  setColorVar(vars, ET_CSS_VARS.olMarkerColor, ol?.markerColor);
  if (ol?.markerFontWeight != null) {
    vars[ET_CSS_VARS.olMarkerFontWeight] = String(ol.markerFontWeight);
  }
}
function applyCheckboxListVars(vars, ulCheckbox) {
  setPxVar(vars, ET_CSS_VARS.checkboxBoxSize, ulCheckbox?.boxSize);
  setPxVar(vars, ET_CSS_VARS.checkboxGapWidth, ulCheckbox?.gapWidth);
  setPxVar(vars, ET_CSS_VARS.checkboxMarginLeft, ulCheckbox?.marginLeft);
  setColorVar(vars, ET_CSS_VARS.checkboxBoxColor, ulCheckbox?.boxColor);
}
function applyMentionVars(vars, mention) {
  if (!mention) return;
  for (const [indicator, mentionStyle] of Object.entries(mention)) {
    setColorVar(vars, ET_MENTION_CSS_VARS.color(indicator), mentionStyle.color);
    setColorVar(vars, ET_MENTION_CSS_VARS.backgroundColor(indicator), mentionStyle.backgroundColor);
    if (mentionStyle.textDecorationLine != null) {
      vars[ET_MENTION_CSS_VARS.textDecorationLine(indicator)] = mentionStyle.textDecorationLine;
    }
  }
}
function expandMentionStylesForIndicatorsIncludeDefault(htmlStyle, htmlStyleToMergeWith) {
  const mentionIndicators = isMentionStyleRecord(htmlStyle?.mention) ? Object.keys(htmlStyle?.mention) : [];
  if (!mentionIndicators.includes(MENTION_STYLE_DEFAULT_KEY)) mentionIndicators.push(MENTION_STYLE_DEFAULT_KEY);
  return expandMentionStylesForIndicators(htmlStyle?.mention, mentionIndicators, htmlStyleToMergeWith);
}
export function htmlStyleToCSSVariables(htmlStyle) {
  const vars = {};
  applyCodeVars(vars, htmlStyle.code);
  applyHeadingVars(vars, htmlStyle);
  applyBlockquoteVars(vars, htmlStyle.blockquote);
  applyCodeblockVars(vars, htmlStyle.codeblock);
  applyLinkVars(vars, htmlStyle.a);
  applyUnorderedListVars(vars, htmlStyle.ul);
  applyOrderedListVars(vars, htmlStyle.ol);
  applyCheckboxListVars(vars, htmlStyle.ulCheckbox);
  applyMentionVars(vars, htmlStyle.mention);
  return vars;
}
const ET_LINK_PRESS_COLOR_VAR = '--et-link-press-color';
export const ET_MENTION_PRESS_CSS_VARS = {
  pressColor: indicator => `--et-mention-${indicatorToMentionCssKey(indicator)}-press-color`,
  pressBackgroundColor: indicator => `--et-mention-${indicatorToMentionCssKey(indicator)}-press-background-color`
};
const DEFAULT_MENTION_PRESS = DEFAULT_ENRICHED_TEXT_STYLE.mention;
function expandVarsWithEnrichedTextLink(vars, anchor) {
  setColorVar(vars, ET_LINK_PRESS_COLOR_VAR, anchor?.pressColor ?? DEFAULT_ENRICHED_TEXT_STYLE.a.pressColor);
}
function expandVarsWithEnrichedTextMention(vars, mention) {
  const isStyleRecord = isMentionStyleRecord(mention);
  const mentionIndicators = isStyleRecord ? Object.keys(mention) : [];
  if (!mentionIndicators.includes(MENTION_STYLE_DEFAULT_KEY)) mentionIndicators.push(MENTION_STYLE_DEFAULT_KEY);
  for (const indicator of mentionIndicators) {
    const style = isStyleRecord ? mention?.[indicator] : mention;
    setColorVar(vars, ET_MENTION_PRESS_CSS_VARS.pressColor(indicator), style?.pressColor ?? (isStyleRecord ? mention.default?.pressColor : undefined) ?? DEFAULT_MENTION_PRESS.pressColor);
    setColorVar(vars, ET_MENTION_PRESS_CSS_VARS.pressBackgroundColor(indicator), style?.pressBackgroundColor ?? (isStyleRecord ? mention.default?.pressBackgroundColor : undefined) ?? DEFAULT_MENTION_PRESS.pressBackgroundColor);
  }
}
function expandCSSPropertiesWithEnrichedTextHtmlStyle(htmlStyle, cssProperties) {
  const vars = {
    ...cssProperties
  };
  expandVarsWithEnrichedTextLink(vars, htmlStyle?.a);
  expandVarsWithEnrichedTextMention(vars, htmlStyle?.mention);
  return vars;
}
export function enrichedTextHtmlStyleToCSSVariables(htmlStyle) {
  const vars = htmlStyleToCSSVariables(htmlStyle);
  return expandCSSPropertiesWithEnrichedTextHtmlStyle(htmlStyle, vars);
}
//# sourceMappingURL=htmlStyleToCSSVariables.js.map