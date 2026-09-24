import { sanitizeHtml } from '../sanitization/htmlSanitizer';
import type { SanitizationConfig } from '../../types';
import {
  checkboxHtmlForTiptap,
  checkboxHtmlFromTiptap,
} from './checkboxHtmlNormalizer';
import { normalizeHtml } from './htmlNormalizer';
import { wrapBareLiContentInParagraph } from './prepareHtmlForWeb';

export function prepareHtmlForTiptap(
  html: string,
  useHtmlNormalizer: boolean | undefined,
  sanitizationConfig?: SanitizationConfig
): string {
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

export function normalizeHtmlFromTiptap(
  html: string,
  getSanitizationConfig: () => SanitizationConfig | undefined
): string {
  const sanitizationConfig = getSanitizationConfig();
  html = sanitizeHtml(html, sanitizationConfig);
  html = checkboxHtmlFromTiptap(html);

  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('span[data-custom-emoji]').forEach((emoji) => {
    emoji.replaceWith(...emoji.childNodes);
  });
  doc.querySelectorAll('li > p').forEach((paragraph) => {
    paragraph.replaceWith(...paragraph.childNodes);
  });
  html = doc.body.innerHTML.replace(/checked=""/g, 'checked');

  // Convert remaining empty <p></p> to <br> (outside of lists)
  html = html.replace(/<p><\/p>/g, '<br>');

  // Convert <img> tags to self-closing tags
  html = html.replace(/<img\b([^>]*)>/gi, (_, attrs: string) => {
    if (attrs.trimEnd().endsWith('/')) {
      return `<img${attrs}>`;
    }
    return `<img${attrs}/>`;
  });

  return `<html>${html}</html>`;
}
