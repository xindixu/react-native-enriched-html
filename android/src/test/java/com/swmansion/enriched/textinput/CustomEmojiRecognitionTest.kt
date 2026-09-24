package com.swmansion.enriched.textinput

import android.graphics.Paint
import android.text.Spannable
import com.facebook.react.bridge.BridgeReactContext
import com.swmansion.enriched.textinput.spans.EnrichedInputCodeBlockSpan
import com.swmansion.enriched.textinput.spans.EnrichedInputCustomEmojiSpan
import com.swmansion.enriched.textinput.spans.EnrichedInputInlineCodeSpan
import com.swmansion.enriched.textinput.spans.EnrichedInputMentionSpan
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotSame
import org.junit.Assert.assertSame
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], shadows = [EmojiArgumentsShadow::class, EmojiUIManagerShadow::class])
class CustomEmojiRecognitionTest {
  private fun editor(): EnrichedTextInputView {
    val context = BridgeReactContext(RuntimeEnvironment.getApplication())
    com.facebook.react.uimanager.DisplayMetricsHolder
      .initDisplayMetrics(context)
    context.setTheme(androidx.appcompat.R.style.Theme_AppCompat)
    return EnrichedTextInputView(context)
  }

  private fun emojis(view: EnrichedTextInputView) = view.text!!.getSpans(0, view.text!!.length, EnrichedInputCustomEmojiSpan::class.java)

  @Test
  fun `Unicode boundaries and adjacent names match web rules`() {
    val excluded = listOf("x:party:", ":party:x", "é:party:", ":party:字", "𐐀:party:", ":party:𐐀", "\u0301:party:", "Ⅳ:party:", "_:party:")
    excluded.forEach { assertEquals(it, emptyList<String>(), CustomEmojiSupport.findMatches(it).map { match -> match.value }.toList()) }
    assertEquals(listOf(":party:", ":foo-bar_2:"), CustomEmojiSupport.findMatches("🦊:party::foo-bar_2:!").map { it.value }.toList())
    assertEquals(listOf(":party:"), CustomEmojiSupport.findMatches(":bad-:party:").map { it.value }.toList())
    assertEquals(emptyList<String>(), CustomEmojiSupport.findMatches(":A:").map { it.value }.toList())
    assertEquals(emptyList<String>(), CustomEmojiSupport.findMatches(":" + "a".repeat(65) + ":").map { it.value }.toList())
  }

  @Test
  fun `code and unrelated mention spans keep source literal while completed emoji mention converts`() {
    val view = editor()
    view.setText(":party: :party: :party: :party: :unknown:")
    val text = view.text!!
    text.setSpan(EnrichedInputInlineCodeSpan(view.htmlStyle), 0, 7, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
    text.setSpan(EnrichedInputCodeBlockSpan(view.htmlStyle), 8, 15, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
    text.setSpan(EnrichedInputMentionSpan(":party:", "@", emptyMap(), view.htmlStyle), 16, 23, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
    val mention = EnrichedInputMentionSpan(":party:", ":", emptyMap(), view.htmlStyle)
    text.setSpan(mention, 24, 31, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
    val support = CustomEmojiSupport(view)
    support.setCatalog(mapOf(":party:" to "/missing-emoji.png"))
    support.refresh()
    assertEquals(1, emojis(view).size)
    assertEquals(24, text.getSpanStart(emojis(view).single()))
    assertEquals(-1, text.getSpanStart(mention))
    assertEquals(":party: :party: :party: :party: :unknown:", text.toString())
    support.dispose()
  }

  @Test
  fun `catalog hydration replacement and removal preserve editable and caret`() {
    val view = editor()
    view.setText(":party: end")
    view.setSelection(7)
    val text = view.text!!
    val support = CustomEmojiSupport(view)
    support.setCatalog(mapOf(":party:" to "/old.png"))
    support.refresh()
    val previous = emojis(view).single()
    support.refresh()
    assertSame(previous, emojis(view).single())
    support.setCatalog(mapOf(":party:" to "/new.png"))
    support.refresh()
    assertNotSame(previous, emojis(view).single())
    assertEquals("/new.png", emojis(view).single().uri)
    support.setCatalog(emptyMap())
    support.refresh()
    assertEquals(0, emojis(view).size)
    assertSame(text, view.text)
    assertEquals(":party: end", text.toString())
    assertEquals(7, view.selectionStart)
    support.dispose()
  }

  @Test
  fun `composing text defers recognition until composition ends`() {
    val view = editor()
    view.setText(":party:")
    val text = view.text!!
    val composing = Any()
    text.setSpan(composing, 0, text.length, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE or Spannable.SPAN_COMPOSING)
    val support = CustomEmojiSupport(view)
    support.setCatalog(mapOf(":party:" to "/missing-emoji.png"))
    support.refresh()
    assertEquals(0, emojis(view).size)
    text.removeSpan(composing)
    support.refresh()
    assertEquals(1, emojis(view).size)
    text.setSpan(composing, 1, 4, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE or Spannable.SPAN_COMPOSING)
    support.refresh()
    assertEquals(0, emojis(view).size)
    assertEquals(":party:", text.toString())
    support.dispose()
  }

  @Test
  fun `emoji box scales with font and failed load measures literal accessible shortcode`() {
    val view = editor()
    val fallback = EnrichedInputCustomEmojiSpan(":party:", "/missing.png", view, true) { _, _ -> }
    val paint = Paint().apply { textSize = 16f }
    assertEquals(kotlin.math.ceil(paint.measureText(":party:")).toInt(), fallback.getSize(paint, ":party:", 0, 7, null))
    assertEquals(":party:", fallback.contentDescription)
    val emoji = EnrichedInputCustomEmojiSpan(":party:", "/missing.png", view) { _, _ -> }
    assertEquals(20, emoji.getSize(paint, ":party:", 0, 7, null))
    paint.textSize = 32f
    assertEquals(40, emoji.getSize(paint, ":party:", 0, 7, null))
    emoji.dispose()
  }

  @Test
  fun `a longer colon mention label is not rewritten`() {
    val view = editor()
    val label = ":party: member"
    view.setText(label)
    val mention = EnrichedInputMentionSpan(label, ":", emptyMap(), view.htmlStyle)
    view.text!!.setSpan(mention, 0, label.length, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
    val support = CustomEmojiSupport(view)
    support.setCatalog(mapOf(":party:" to "/missing.png"))
    support.refresh()
    assertEquals(0, emojis(view).size)
    assertEquals(0, view.text!!.getSpanStart(mention))
    support.dispose()
  }
}
