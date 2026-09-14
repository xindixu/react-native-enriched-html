# Controlled Paste

Provide `onPaste` to intercept clipboard text and HTML before insertion on web,
iOS, and Android. Without this callback, paste keeps its default behavior.
Pasted images continue through `onPasteImages`.

```tsx
<EnrichedTextInput
  ref={editorRef}
  onPaste={async ({ nativeEvent: { requestId, html, text } }) => {
    const editor = editorRef.current;
    if (!editor) return;
    const normalizedHTML = normalizeClipboardContent(html, text);
    const applied = await editor.completePaste(requestId, normalizedHTML);
    // `applied` reports whether this request inserted content.
  }}
/>
```

`normalizeClipboardContent` is application code. It must return the constrained
HTML the application wants to insert, escaping plain text when no HTML exists.
The editor does not interpret the application's Markdown or wire format.

A paste request captures its insertion selection. A newer paste, a document or
selection change, loss of focus, disabling the editor or callback, and disposal
invalidate that request. `completePaste(requestId, html)` resolves `false` for
an invalid request, and an applied request cannot be completed twice. Passing
an empty HTML string cancels without deleting selected text.

Capture the receiving editor before asynchronous application work. Do not route
an old request through a ref that may now point to another document. Catch
conversion failures and cancel or provide an escaped plain-text fallback.
Successful completion replaces the captured selection as one undoable edit.
