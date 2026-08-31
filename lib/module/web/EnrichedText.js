"use strict";

import { memo, useImperativeHandle, useMemo, useRef, useState } from 'react';
import './EnrichedText.css';
import { enrichedTextStyleToCSSProperties } from "./styleConversion/enrichedTextStyleToCSSProperties.js";
import { mergeWithDefaultEnrichedTextHtmlStyle } from "./styleConversion/htmlStyleToCSSVariables.js";
import { enrichedTextHtmlStyleToCSSVariables } from "./styleConversion/htmlStyleToCSSVariables.js";
import { ENRICHED_TEXT_CLASSNAME } from "./constants/classNames.js";
import { enrichedTextThemingToCSSProperties } from "./styleConversion/enrichedThemingToCSSProperties.js";
import { buildMentionRulesCSS } from "./styleConversion/buildMentionRulesCSS.js";
import { sanitizeHtml } from "./sanitization/htmlSanitizer.js";
import { prepareHtmlForWeb } from "./normalization/prepareHtmlForWeb.js";
import { INLINE_IMAGE_CSS_VARIABLES } from "./styleConversion/inlineImageCSSVariables.js";
import { useImageErrorFallback } from "./htmlExtensions/useImageErrorFallback.js";
import { usePressInteractions } from "./htmlExtensions/usePressInteractions.js";
import { useEllipsizeMode } from "./ellipsizeMode/useEllipsizeMode.js";
import { adaptWebToNativeEvent } from "./nativeMappers/adaptWebToNativeEvent.js";
import { useStableRef } from "./utils/useStableRef.js";
import { assertBrowserEnvironment } from "./utils/assertBrowserEnvironment.js";
import { useOrderedListMarkerWidth } from "./htmlExtensions/useOrderedListMarkerWidth.js";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
export const EnrichedText = /*#__PURE__*/memo(({
  ref,
  children,
  htmlStyle,
  style,
  selectionColor,
  ellipsizeMode = 'tail',
  numberOfLines = 0,
  selectable = false,
  useHtmlNormalizer = true,
  sanitizationConfig,
  onFocus,
  onBlur,
  onLinkPress,
  onMentionPress
}) => {
  assertBrowserEnvironment('EnrichedText');
  const containerRef = useRef(null);
  useImperativeHandle(ref, () => ({
    measureInWindow: () => {},
    measure: () => {},
    measureLayout: () => {},
    setNativeProps: () => {},
    focus: () => {
      containerRef.current?.focus();
    },
    blur: () => {
      containerRef.current?.blur();
    }
  }));
  const sanitizedHtml = useMemo(() => sanitizeHtml(children, sanitizationConfig), [children, sanitizationConfig]);
  const finalHtml = useMemo(() => prepareHtmlForWeb(sanitizedHtml, useHtmlNormalizer), [sanitizedHtml, useHtmlNormalizer]);
  const [clampedHtml, setClampedHtml] = useState(numberOfLines <= 0 ? finalHtml : null);
  const resolvedHtmlStyle = useMemo(() => mergeWithDefaultEnrichedTextHtmlStyle(htmlStyle), [htmlStyle]);
  const textStyle = useMemo(() => enrichedTextStyleToCSSProperties(style ?? {}), [style]);
  const cssVars = useMemo(() => ({
    ...enrichedTextHtmlStyleToCSSVariables(resolvedHtmlStyle),
    ...INLINE_IMAGE_CSS_VARIABLES
  }), [resolvedHtmlStyle]);
  const themingStyle = useMemo(() => enrichedTextThemingToCSSProperties({
    selectionColor,
    selectable
  }), [selectionColor, selectable]);
  const mentionRulesCSS = useMemo(() => buildMentionRulesCSS(resolvedHtmlStyle, !!onMentionPress), [resolvedHtmlStyle, onMentionPress]);
  const finalStyle = useMemo(() => ({
    ...textStyle,
    ...themingStyle,
    ...cssVars
  }), [textStyle, themingStyle, cssVars]);
  useEllipsizeMode({
    containerRef,
    finalHtml,
    ellipsizeMode,
    numberOfLines,
    setClampedHtml,
    style,
    htmlStyle
  });
  const onLinkPressRef = useStableRef(onLinkPress);
  const onMentionPressRef = useStableRef(onMentionPress);
  useOrderedListMarkerWidth(containerRef, finalHtml);
  useImageErrorFallback(containerRef);
  usePressInteractions(containerRef, onLinkPressRef, onMentionPressRef);
  return /*#__PURE__*/_jsxs(_Fragment, {
    children: [mentionRulesCSS ? /*#__PURE__*/_jsx("style", {
      children: mentionRulesCSS
    }) : null, /*#__PURE__*/_jsx("div", {
      ref: containerRef,
      tabIndex: -1,
      style: finalStyle,
      className: ENRICHED_TEXT_CLASSNAME,
      onFocus: event => onFocus?.(adaptWebToNativeEvent(event, {
        target: -1
      })),
      onBlur: event => onBlur?.(adaptWebToNativeEvent(event, {
        target: -1
      })),
      dangerouslySetInnerHTML: {
        __html: clampedHtml ?? ''
      }
    })]
  });
});
//# sourceMappingURL=EnrichedText.js.map