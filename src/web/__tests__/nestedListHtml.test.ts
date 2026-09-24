import { normalizeHtml } from '../normalization/htmlNormalizer';
import { Editor } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { EnrichedListItem } from '../formats/EnrichedListItem';
import { EnrichedCheckboxItem } from '../formats/EnrichedCheckboxItem';
import { EnrichedOrderedList } from '../formats/EnrichedOrderedList';
import { EnrichedUnorderedList } from '../formats/EnrichedUnorderedList';
import { EnrichedCheckboxList } from '../formats/EnrichedCheckboxList';
import {
  checkboxHtmlForTiptap,
  checkboxHtmlFromTiptap,
} from '../normalization/checkboxHtmlNormalizer';
import {
  normalizeHtmlFromTiptap,
  prepareHtmlForTiptap,
} from '../normalization/tiptapHtmlNormalizer';
import { prepareHtmlForWeb } from '../normalization/prepareHtmlForWeb';

describe('nested list HTML', () => {
  test.each(['ul', 'ol'])(
    'real editor restores empty %s parents without lifting children',
    (tag) => {
      const html = `<${tag}><li><ul><li>child</li></ul></li></${tag}>`;
      const editor = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          EnrichedListItem,
          EnrichedCheckboxItem,
          EnrichedOrderedList,
          EnrichedUnorderedList,
          EnrichedCheckboxList,
        ],
        content: prepareHtmlForTiptap(html, true),
      });
      try {
        expect(normalizeHtmlFromTiptap(editor.getHTML(), () => undefined)).toBe(
          `<html>${html}</html>`
        );
      } finally {
        editor.destroy();
      }
    }
  );
  test.each(['ul', 'ol', 'ul data-type="checkbox"'])(
    'real editor restores mixed children under %s',
    (parent) => {
      const html = `<${parent}><li>parent<ul><li>bullet</li></ul><ol><li>number<ul data-type="checkbox"><li checked>done</li></ul></li></ol><ul data-type="checkbox"><li><ul><li>empty parent</li></ul></li></ul></li></${parent.split(' ')[0]}>`;
      const editor = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          EnrichedListItem,
          EnrichedCheckboxItem,
          EnrichedOrderedList,
          EnrichedUnorderedList,
          EnrichedCheckboxList,
        ],
        content: prepareHtmlForTiptap(html, true),
      });
      try {
        expect(normalizeHtmlFromTiptap(editor.getHTML(), () => undefined)).toBe(
          `<html>${html}</html>`
        );
      } finally {
        editor.destroy();
      }
    }
  );
  test('display preserves empty parents and independently renders nested checkboxes', () => {
    const html =
      '<ul data-type="checkbox"><li checked>parent<ul><li><ol><li>leaf</li></ol></li></ul><ul data-type="checkbox"><li>child</li></ul></li></ul>';
    const doc = new DOMParser().parseFromString(
      prepareHtmlForWeb(html, true),
      'text/html'
    );
    expect(doc.querySelectorAll('input')).toHaveLength(2);
    expect(doc.querySelectorAll('input[checked]')).toHaveLength(1);
    expect(doc.querySelector('ul:not([data-type]) > li > p')?.textContent).toBe(
      ''
    );
    expect(doc.querySelector('ul:not([data-type]) > li > input')).toBeNull();
    expect(
      doc
        .querySelector(
          'ul[data-type="checkbox"] ul[data-type="checkbox"] > li > input'
        )
        ?.hasAttribute('checked')
    ).toBe(false);
  });
  test.each([
    '<ul><li>parent<ol><li>child<ul><li>leaf</li></ul></li></ol></li></ul>',
    '<ul data-type="checkbox"><li checked>parent<ul><li>bullet</li></ul><ul data-type="checkbox"><li>task</li></ul></li></ul>',
    '<ol><li><ul><li>child</li></ul></li></ol>',
  ])('normalization preserves the hierarchy of %s', (html) => {
    expect(normalizeHtml(html)).toBe(html);
  });

  test('paragraph wrappers and pretty-printing do not create extra list items', () => {
    expect(
      normalizeHtml(
        '<ul><li><p>parent</p>\n  <ol><li><p>child</p></li></ol>\n</li></ul>'
      )
    ).toBe('<ul><li>parent<ol><li>child</li></ol></li></ul>');
  });

  test('importing checkboxes does not change descendant bullets', () => {
    const doc = new DOMParser().parseFromString(
      checkboxHtmlForTiptap(
        '<ul data-type="checkbox"><li checked>parent<ul><li>bullet</li></ul><ul data-type="checkbox"><li>child</li></ul></li></ul>'
      ),
      'text/html'
    );
    expect(doc.querySelectorAll('li[data-type="checkboxItem"]')).toHaveLength(
      2
    );
    expect(doc.querySelector('ul:not([data-type]) > li')?.outerHTML).toBe(
      '<li>bullet</li>'
    );
    expect(doc.querySelector('li[data-checked="true"] > p')?.textContent).toBe(
      'parent'
    );
    expect(doc.querySelector('li[data-checked="false"] > p')?.textContent).toBe(
      'child'
    );
    expect(doc.querySelector('p ul')).toBeNull();
  });

  test('exporting checkboxes keeps nested lists and independent checked state', () => {
    const html =
      '<ul data-type="checkboxList"><li data-type="checkboxItem" data-checked="true"><label><input type="checkbox"></label><div><p>parent</p><ol><li><p>bullet</p></li></ol><ul data-type="checkboxList"><li data-type="checkboxItem" data-checked="false"><label><input type="checkbox"></label><div><p>child</p></div></li></ul></div></li></ul>';
    expect(checkboxHtmlFromTiptap(html)).toBe(
      '<ul data-type="checkbox"><li checked><p>parent</p><ol><li><p>bullet</p></li></ol><ul data-type="checkbox"><li><p>child</p></li></ul></li></ul>'
    );
    expect(normalizeHtmlFromTiptap(html, () => undefined)).toBe(
      '<html><ul data-type="checkbox"><li checked>parent<ol><li>bullet</li></ol><ul data-type="checkbox"><li>child</li></ul></li></ul></html>'
    );
  });

  test('export unwraps only direct paragraphs and retains empty parents', () => {
    expect(
      normalizeHtmlFromTiptap(
        '<ul><li><p></p><ol><li><p><strong>child</strong></p></li></ol></li></ul>',
        () => undefined
      )
    ).toBe(
      '<html><ul><li><ol><li><strong>child</strong></li></ol></li></ul></html>'
    );
  });
});
