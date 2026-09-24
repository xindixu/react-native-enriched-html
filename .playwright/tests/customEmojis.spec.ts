import { test, expect } from '@playwright/test';

const pixel = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);
test.beforeEach(async ({ page }) => {
  await page.route('**/custom-emoji.gif', (route) =>
    route.fulfill({ contentType: 'image/gif', body: pixel })
  );
  await page.goto('/test-custom-emojis');
});

test('typing, keyboard deletion, undo and redo retain the shortcode', async ({
  page,
}) => {
  const editor = page.locator('.ProseMirror');
  const image = editor.locator('img[alt=":party:"]');
  await editor.click();
  await page.keyboard.type(':party:');
  await expect(image).toHaveCount(1);
  await expect(page.getByTestId('html')).toHaveText(
    '<html><p>:party:</p></html>'
  );
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Delete');
  await expect(image).toHaveCount(0);
  await page.keyboard.press('Control+z');
  await expect(image).toHaveCount(1);
  await page.keyboard.press('Control+Shift+z');
  await expect(image).toHaveCount(0);
});

test('restores formatting, maintains caret placement and copies shortcodes', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  const editor = page.locator('.ProseMirror');
  await expect(editor.locator('b img[alt=":party:"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'After emoji', exact: true }).click();
  await expect(editor).toBeFocused();
  await page.keyboard.type('!');
  await expect(page.getByTestId('html')).toContainText('<b>Hi :party:!</b>');
  await page.keyboard.press('Control+a');
  await page.keyboard.press('Control+c');
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('Hi :party:!\n\nafter');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Control+v');
  await expect(editor.locator('img[alt=":party:"]')).toHaveCount(1);
  await expect(page.getByTestId('html')).toContainText(':party:!');
});

test('autocomplete replaces the query and catalog removal preserves text', async ({
  page,
}) => {
  const editor = page.locator('.ProseMirror');
  await editor.click();
  await page.keyboard.type(':par');
  await page
    .getByRole('button', { name: 'Complete emoji', exact: true })
    .click();
  await expect(editor.locator('img[alt=":party:"]')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Toggle catalog', exact: true })
    .click();
  await expect(editor.locator('img[alt=":party:"]')).toHaveCount(0);
  await expect(editor).toContainText(':party:');
  await page
    .getByRole('button', { name: 'Toggle catalog', exact: true })
    .click();
  await expect(editor.locator('img[alt=":party:"]')).toHaveCount(1);
});

test('failed image loading displays and reports the shortcode', async ({
  page,
}) => {
  await page.route('**/custom-emoji.gif', (route) => route.abort());
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.getByTestId('failures')).toHaveText('1');
  await expect(page.locator('.ProseMirror')).toContainText('Hi :party:');
  await expect(page.getByTestId('html')).toContainText('<b>Hi :party:</b>');
});
