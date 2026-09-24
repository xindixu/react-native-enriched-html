"use strict";

import { normalizeHtml } from "./htmlNormalizer.js";
export function prepareHtmlForWeb(html, useHtmlNormalizer) {
  if (useHtmlNormalizer) {
    html = normalizeHtml(html);
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  wrapBareLiContentInParagraph(doc);
  checkboxHtmlToWeb(doc);
  return doc.body.innerHTML;
}

/*
 * Native list format:
 *   <ul>
 *     <li>foo</li>
 *     <li></li>
 *   </ul>
 *
 * Web-native, with <p> wrappers to display the content correctly:
 *   <ul>
 *     <li>
 *       <p>foo</p>
 *     </li>
 *     <li>
 *       <p></p>
 *     </li>
 *   </ul>
 */
export function wrapBareLiContentInParagraph(doc) {
  // Target only standard lists (ignore checkbox lists, as they get wrapped in <label> later)
  const listItems = doc.querySelectorAll('ul:not([data-type="checkbox"]) > li, ol > li');
  listItems.forEach(li => {
    if (li.firstElementChild?.tagName.toUpperCase() === 'P') return;
    const nodesToWrap = [];
    const childNodes = Array.from(li.childNodes);
    for (const node of childNodes) {
      if (node.nodeType === Node.ELEMENT_NODE && ['UL', 'OL'].includes(node.tagName.toUpperCase())) {
        break;
      }
      nodesToWrap.push(node);
    }
    const p = doc.createElement('p');
    li.insertBefore(p, childNodes[0] || null);
    nodesToWrap.forEach(node => p.appendChild(node));
  });
}

/*
 * Native checkbox format (as produced by the editor):
 *   <ul data-type="checkbox">
 *     <li checked>foo</li>
 *     <li>bar</li>
 *   </ul>
 *
 * Web-native, display-only format:
 *   <ul data-type="checkbox">
 *     <li>
 *       <input type="checkbox" checked>
 *       <label>foo</label>
 *     </li>
 *     <li>
 *       <input type="checkbox">
 *       <label>bar</label>
 *     </li>
 *   </ul>
 */
function checkboxHtmlToWeb(doc) {
  doc.querySelectorAll('ul[data-type="checkbox"]').forEach(ul => {
    Array.from(ul.children).filter(el => el.tagName === 'LI').forEach(li => {
      const checked = li.hasAttribute('checked');
      li.removeAttribute('checked');
      const input = doc.createElement('input');
      input.type = 'checkbox';
      if (checked) input.setAttribute('checked', '');
      const label = doc.createElement('label');
      while (li.firstChild && !(li.firstChild instanceof Element && ['UL', 'OL'].includes(li.firstChild.tagName))) {
        label.appendChild(li.firstChild);
      }
      li.prepend(input, label);
    });
  });
}
//# sourceMappingURL=prepareHtmlForWeb.js.map