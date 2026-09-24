"use strict";

import { sanitizeHtml } from "../sanitization/htmlSanitizer.js";
import { checkboxHtmlForTiptap, checkboxHtmlFromTiptap } from "./checkboxHtmlNormalizer.js";
import { normalizeHtml } from "./htmlNormalizer.js";
import { wrapBareLiContentInParagraph } from "./prepareHtmlForWeb.js";
export function prepareHtmlForTiptap(html, useHtmlNormalizer, sanitizationConfig) {
  html = sanitizeHtml(html, sanitizationConfig);
  if (useHtmlNormalizer) {
    html = normalizeHtml(html);
  }
  html = checkboxHtmlForTiptap(html);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  wrapBareLiContentInParagraph(doc);
  html = doc.body.innerHTML;
  html = html.replace(/<br\s*\/?>/gi, '<p></p>');
  return html;
}
export function normalizeHtmlFromTiptap(html, getSanitizationConfig) {
  const sanitizationConfig = getSanitizationConfig();
  html = sanitizeHtml(html, sanitizationConfig);
  html = checkboxHtmlFromTiptap(html);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('span[data-custom-emoji]').forEach(emoji => {
    emoji.replaceWith(...emoji.childNodes);
  });
  doc.querySelectorAll('li > p').forEach(paragraph => {
    paragraph.replaceWith(...paragraph.childNodes);
  });
  html = doc.body.innerHTML.replace(/checked=""/g, 'checked');

  // Convert remaining empty <p></p> to <br> (outside of lists)
  html = html.replace(/<p><\/p>/g, '<br>');

  // Convert <img> tags to self-closing tags
  html = html.replace(/<img\b([^>]*)>/gi, (_, attrs) => {
    if (attrs.trimEnd().endsWith('/')) {
      return `<img${attrs}>`;
    }
    return `<img${attrs}/>`;
  });
  return `<html>${html}</html>`;
}
//# sourceMappingURL=tiptapHtmlNormalizer.js.map