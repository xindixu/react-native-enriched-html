import { test, expect } from '@playwright/test';
import { toolbarButton } from '../helpers/toolbar';
import {
  editorLocator,
  getSerializedHtml,
  gotoVisualRegression,
  setEditorHtml,
} from '../helpers/visual-regression';

test.beforeEach(async ({ page }) => gotoVisualRegression(page));

for (const [name, tag, attrs] of [
  ['bullets', 'ul', ''],
  ['numbers', 'ol', ''],
  ['checkboxes', 'ul', ' data-type="checkbox"'],
] as const) {
  test(`${name}: indent, continue empty items, outdent and undo`, async ({
    page,
  }) => {
    const initial = `<html><${tag}${attrs}><li>parent</li><li>child</li></${tag}></html>`;
    await setEditorHtml(page, initial);
    const editor = editorLocator(page);
    await editor.locator('p').filter({ hasText: 'child' }).click();
    await page.keyboard.press('End');
    await page.keyboard.press('Tab');
    await expect
      .poll(() => getSerializedHtml(page))
      .toBe(
        `<html><${tag}${attrs}><li>parent<${tag}${attrs}><li>child</li></${tag}></li></${tag}></html>`
      );
    const paragraphs = editor.locator('p');
    const parentBox = await paragraphs.nth(0).boundingBox();
    const childBox = await paragraphs.nth(1).boundingBox();
    expect(childBox!.x).toBeGreaterThan(parentBox!.x);
    expect(childBox!.y).toBeGreaterThanOrEqual(
      parentBox!.y + parentBox!.height - 1
    );
    await page.keyboard.press('Shift+Tab');
    await expect.poll(() => getSerializedHtml(page)).toBe(initial);
    await page.keyboard.press('ControlOrMeta+z');
    await expect(editor.locator('li li')).toHaveCount(1);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expect(editor.locator('li li')).toHaveCount(3);
  });
}

test('mixed checkbox trees survive export and hydration with independent state', async ({
  page,
}) => {
  const initial =
    '<html><ul data-type="checkbox"><li checked>parent<ol><li>number<ul data-type="checkbox"><li>child</li></ul></li></ol></li></ul></html>';
  await setEditorHtml(page, initial);
  await expect.poll(() => getSerializedHtml(page)).toBe(initial);
  const editor = editorLocator(page);
  await expect(editor.locator('input:checked')).toHaveCount(1);
  await editor.locator('input').last().click();
  await expect(editor.locator('input:checked')).toHaveCount(2);
  const html = await getSerializedHtml(page);
  expect(html).toContain('<li checked>child</li>');
  await setEditorHtml(page, html);
  await expect.poll(() => getSerializedHtml(page)).toBe(html);
});

test('changing the inner list type retains grandchildren', async ({ page }) => {
  await setEditorHtml(
    page,
    '<html><ul><li>parent<ul><li>child<ul data-type="checkbox"><li checked>leaf</li></ul></li></ul></li></ul></html>'
  );
  const editor = editorLocator(page);
  await editor
    .locator('p')
    .filter({ hasText: /^child$/ })
    .click();
  await toolbarButton(page, 'orderedList').click();
  await expect
    .poll(() => getSerializedHtml(page))
    .toBe(
      '<html><ul><li>parent<ol><li>child<ul data-type="checkbox"><li checked>leaf</li></ul></li></ol></li></ul></html>'
    );
});

test('first item Tab moves browser focus without changing content', async ({
  page,
}) => {
  const initial = '<html><ul><li>first</li></ul></html>';
  await setEditorHtml(page, initial);
  const editor = editorLocator(page);
  await editor.locator('p').click();
  await page.keyboard.press('Tab');
  await expect(editor).not.toBeFocused();
  await expect.poll(() => getSerializedHtml(page)).toBe(initial);
});

test('display places nested lists below their parent and preserves checkbox state', async ({
  page,
}) => {
  await page.goto('/test-enriched-text');
  const html =
    '<html><ul><li>parent<ol><li>child<ul data-type="checkbox"><li checked>done</li><li>todo</li></ul></li></ol></li></ul></html>';
  await page.getByTestId('test-enriched-text-html-input').fill(html);
  await page.getByTestId('test-enriched-text-set-value-button').click();
  const display = page.locator('.et-view');
  await expect(display.locator('input')).toHaveCount(2);
  await expect(display.locator('input:checked')).toHaveCount(1);
  const parent = await display
    .locator('p')
    .filter({ hasText: /^parent$/ })
    .boundingBox();
  const child = await display
    .locator('p')
    .filter({ hasText: /^child$/ })
    .boundingBox();
  const task = await display
    .locator('label')
    .filter({ hasText: /^done$/ })
    .boundingBox();
  expect(child!.x).toBeGreaterThan(parent!.x);
  expect(child!.y).toBeGreaterThanOrEqual(parent!.y + parent!.height - 1);
  expect(task!.x).toBeGreaterThan(child!.x);
  expect(task!.y).toBeGreaterThanOrEqual(child!.y + child!.height - 1);
});
