import { test, expect } from '@playwright/test';

import {
  editorLocator,
  gotoVisualRegression,
  getSerializedHtml,
  setEditorHtml,
} from '../helpers/visual-regression';

const CASES = [
  {
    name: 'ul under ul',
    html: '<html><ul><li>item<ul><li>nested</li></ul></li></ul></html>',
    markers: ['item', 'nested'],
  },
  {
    name: 'ol under ul',
    html: '<html><ul><li>outer<ol><li>nested</li></ol></li></ul></html>',
    markers: ['outer', 'nested'],
  },
  {
    name: 'ul under ol',
    html: '<html><ol><li>outer<ul><li>nested</li></ul></li></ol></html>',
    markers: ['outer', 'nested'],
  },
  {
    name: 'triple nested ul',
    html: '<html><ul><li>outer<ul><li>nested<ul><li>deep</li></ul></li></ul></li></ul></html>',
    markers: ['outer', 'nested', 'deep'],
  },
] as const;

test.describe('list nested html', () => {
  test.beforeEach(async ({ page }) => {
    await gotoVisualRegression(page);
  });

  for (const { name, html, markers } of CASES) {
    test(name, async ({ page }) => {
      await setEditorHtml(page, html);

      const editor = editorLocator(page);
      for (const m of markers) {
        await expect(editor).toContainText(m);
      }

      await expect.poll(() => getSerializedHtml(page)).toBe(html);
      const paragraphs = editor.locator('li > p');
      for (let i = 1; i < markers.length; i++) {
        const parent = await paragraphs.nth(i - 1).boundingBox();
        const child = await paragraphs.nth(i).boundingBox();
        expect(child!.x).toBeGreaterThan(parent!.x);
        expect(child!.y).toBeGreaterThanOrEqual(parent!.y + parent!.height - 1);
      }
    });
  }
});
