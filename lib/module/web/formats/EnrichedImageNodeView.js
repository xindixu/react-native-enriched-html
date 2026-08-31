"use strict";

import { NodeViewWrapper } from '@tiptap/react';
import { useState } from 'react';
import { BROKEN_IMAGE_PATH_D } from "../constants/brokenImageGlyph.js";
import { jsx as _jsx } from "react/jsx-runtime";
const IMAGE_FALLBACK_SIZE = 80;
function BrokenImageGlyph() {
  return /*#__PURE__*/_jsx("svg", {
    viewBox: "0 0 960 960",
    width: "100%",
    height: "100%",
    preserveAspectRatio: "xMidYMid meet",
    "aria-hidden": true,
    focusable: "false",
    className: "eti-inline-image-broken-glyph",
    children: /*#__PURE__*/_jsx("path", {
      fill: "currentColor",
      d: BROKEN_IMAGE_PATH_D
    })
  });
}
function dim(value) {
  if (value == null) return undefined;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const n = parseFloat(String(value));
  return Number.isNaN(n) ? undefined : n;
}
export function EnrichedImageNodeView({
  node
}) {
  const src = (node.attrs.src ?? '').trim();
  const rawW = dim(node.attrs.width);
  const rawH = dim(node.attrs.height);
  const [errored, setErrored] = useState(false);
  const showPlaceholder = src.length === 0 || errored;
  const placeholderW = rawW ?? IMAGE_FALLBACK_SIZE;
  const placeholderH = rawH ?? IMAGE_FALLBACK_SIZE;
  const sizeStyle = {
    width: placeholderW,
    height: placeholderH
  };
  if (showPlaceholder) {
    return /*#__PURE__*/_jsx(NodeViewWrapper, {
      as: "span",
      className: "eti-inline-image eti-inline-image--placeholder",
      style: sizeStyle,
      "data-eti-image-placeholder": "",
      children: /*#__PURE__*/_jsx(BrokenImageGlyph, {})
    });
  }
  let imgDims;
  let imgStyle;
  if (rawW != null && rawH != null) {
    imgDims = {
      width: rawW,
      height: rawH
    };
    imgStyle = undefined;
  } else if (rawH != null) {
    imgDims = {
      height: rawH
    };
    imgStyle = {
      width: 'auto'
    };
  } else {
    imgDims = {
      width: rawW ?? IMAGE_FALLBACK_SIZE
    };
    imgStyle = {
      height: 'auto'
    };
  }
  return /*#__PURE__*/_jsx(NodeViewWrapper, {
    as: "span",
    className: "eti-inline-image",
    children: /*#__PURE__*/_jsx("img", {
      ...imgDims,
      src: src,
      alt: "",
      className: "eti-inline-image-img",
      style: imgStyle,
      contentEditable: false,
      draggable: false,
      onError: () => setErrored(true)
    })
  });
}
//# sourceMappingURL=EnrichedImageNodeView.js.map