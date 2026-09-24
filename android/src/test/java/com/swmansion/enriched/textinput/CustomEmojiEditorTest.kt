package com.swmansion.enriched.textinput

import android.text.Spanned
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.bridge.JavaOnlyArray
import com.facebook.react.bridge.JavaOnlyMap
import com.swmansion.enriched.common.parser.EnrichedParser
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], shadows = [EmojiArgumentsShadow::class, EmojiUIManagerShadow::class])
class CustomEmojiEditorTest {
  private fun editor(): EnrichedTextInputView {
    val context = BridgeReactContext(RuntimeEnvironment.getApplication())
    com.facebook.react.uimanager.DisplayMetricsHolder
      .initDisplayMetrics(context)
    context.setTheme(androidx.appcompat.R.style.Theme_AppCompat)
    return EnrichedTextInputView(context).also {
      EnrichedTextInputViewManager().setCustomEmojis(
        it,
        JavaOnlyArray.of(JavaOnlyMap.of("shortcode", ":party:", "uri", "/missing-emoji.png")),
      )
    }
  }

  @Test fun `catalog recognizes hydrated shortcode as one public character`() {
    val view = editor()
    view.setValue("<html><b>:party:</b>!</html>")
    view.setCustomSelection(1, 1)
    assertEquals(7, view.selectionStart)
    assertEquals(":party:!", view.text.toString())
    val html = EnrichedParser.toHtml(view.text as Spanned)
    assertTrue(html.contains(":party:"))
    assertFalse(html.contains("<img"))
  }

  @Test fun `typed emoji deletes atomically and native undo redo retain shortcode`() {
    val view = editor()
    view.setValue("start ")
    view.text!!.append(":party:")
    view.setSelection(view.text!!.length)
    assertEquals("start \uFFFC", view.text!!.renderedText())
    assertTrue(view.deleteEmojiRange(view.selectionStart - 1, view.selectionEnd))
    assertEquals("start ", view.text.toString())
    assertTrue(view.onTextContextMenuItem(android.R.id.undo))
    assertEquals("start :party:", view.text.toString())
    assertEquals("start \uFFFC", view.text!!.renderedText())
    assertTrue(view.onTextContextMenuItem(android.R.id.redo))
    assertEquals("start ", view.text.toString())
  }

  @Test fun `shortcode conversion does not create an undo step`() {
    val view = editor()
    view.setValue(":party")
    view.text!!.append(":")
    assertEquals("\uFFFC", view.text!!.renderedText())
    assertTrue(view.onTextContextMenuItem(android.R.id.undo))
    assertEquals(":party", view.text.toString())
    assertEquals(":party", view.text!!.renderedText())
    assertTrue(view.onTextContextMenuItem(android.R.id.redo))
    assertEquals("\uFFFC", view.text!!.renderedText())
  }

  @Test fun `copy and cut expose shortcodes in plain text and html`() {
    val view = editor()
    view.setValue("<html><b>:party:</b>!</html>")
    view.setCustomSelection(0, 1)
    assertTrue(view.onTextContextMenuItem(android.R.id.copy))
    val clipboard = view.context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
    val item = clipboard.primaryClip!!.getItemAt(0)
    assertEquals(":party:", item.text.toString())
    assertTrue(item.htmlText!!.contains(":party:"))
    assertTrue(item.htmlText!!.contains("<b>"))
    assertFalse(item.htmlText!!.contains("<img"))
    assertTrue(view.onTextContextMenuItem(android.R.id.cut))
    assertEquals("!", view.text.toString())
    view.handleTextPaste(clipboard.primaryClip!!)
    assertEquals(":party:!", view.text.toString())
    assertEquals("\uFFFC!", view.text!!.renderedText())
  }

  @Test fun `limits count shortcode characters rather than the rendered box`() {
    val view = editor()
    view.maxPlainTextLength = 7
    view.setValue(":party:")
    view.text!!.append("!")
    assertEquals(":party:", view.text.toString())
    assertEquals("\uFFFC", view.text!!.renderedText())
    view.text!!.delete(0, 7)
    assertEquals("", view.text.toString())
  }

  @Test fun `selection and links map across multiple tokens and list anchors`() {
    val view = editor()
    view.setValue("\u200B:party: :party:!")
    view.setCustomSelection(2, 3)
    assertEquals(9, view.selectionStart)
    assertEquals(16, view.selectionEnd)
    view.setSelection(11)
    assertTrue(view.selectionStart == 9 || view.selectionStart == 16)
    view.addLink(2, 3, ":party:", "https://example.com")
    val html = EnrichedParser.toHtml(view.text as Spanned)
    assertTrue(html.contains("https://example.com"))
    assertFalse(html.contains("<img"))
  }

  @Test fun `catalog changes preserve undo and normalize an interior caret`() {
    val view = editor()
    view.setCustomEmojis(null)
    view.setValue(":party")
    view.text!!.append(":")
    view.setSelection(3)
    val editable = view.text
    view.setCustomEmojis(JavaOnlyArray.of(JavaOnlyMap.of("shortcode", ":party:", "uri", "/new.png")))
    assertSame(editable, view.text)
    assertTrue(view.selectionStart == 0 || view.selectionStart == 7)
    assertTrue(view.onTextContextMenuItem(android.R.id.undo))
    assertEquals(":party", view.text.toString())
  }

  @Test fun `IME commit recognizes only when composition finishes`() {
    val view = editor()
    view.setValue("")
    val connection = view.onCreateInputConnection(android.view.inputmethod.EditorInfo())!!
    connection.setComposingText(":party:", 1)
    assertEquals(":party:", view.text!!.renderedText())
    connection.finishComposingText()
    assertEquals("\uFFFC", view.text!!.renderedText())
    connection.deleteSurroundingText(1, 0)
    assertEquals("", view.text.toString())
  }

  @Test
  fun `emoji paste is a single native undoable edit`() {
    val view = editor()
    view.setValue("before ")
    view.setSelection(view.text!!.length)
    view.handleTextPaste(android.content.ClipData.newPlainText("emoji", ":party:"))
    assertEquals("before \uFFFC", view.text!!.renderedText())
    assertTrue(view.onTextContextMenuItem(android.R.id.undo))
    assertEquals("before ", view.text.toString())
    assertTrue(view.onTextContextMenuItem(android.R.id.redo))
    assertEquals("before \uFFFC", view.text!!.renderedText())
  }

  @Test
  fun `completed emoji mention serializes as shortcode and preserves formatting`() {
    val view = editor()
    view.setValue("<html><b>:par</b></html>")
    view.setSelection(view.text!!.length)
    view.parametrizedStyles!!.mentionIndicators = arrayOf(":")
    view.parametrizedStyles!!.afterSelectionChangedMentions(4, 4)
    EnrichedTextInputViewManager().addMention(view, ":", ":party:", "{}")
    assertEquals("\uFFFC ", view.text!!.renderedText())
    val html = EnrichedParser.toHtml(view.text as Spanned)
    assertTrue(html.contains(":party:"))
    assertFalse(html.contains("<mention"))
  }
}
