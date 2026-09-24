package com.swmansion.enriched.textinput

import android.text.Spanned
import com.swmansion.enriched.textinput.spans.EnrichedInputCustomEmojiSpan

/** Maps retained shortcode storage to the UTF-16 coordinates exposed by selection APIs. */
internal class CustomEmojiCoordinates(
  private val source: CharSequence,
  emojiRanges: List<IntRange>,
) {
  private val ranges = emojiRanges.sortedBy { it.first }

  fun renderedText(): String =
    buildString {
      var index = 0
      var emojiIndex = 0
      while (index < source.length) {
        val emoji = ranges.getOrNull(emojiIndex)
        if (emoji != null && index == emoji.first) {
          append('\uFFFC')
          index = emoji.last + 1
          emojiIndex++
        } else {
          if (source[index] != '\u200B') append(source[index])
          index++
        }
      }
    }

  /** An offset inside an emoji resolves to its leading rendered boundary. */
  fun renderedOffset(raw: Int): Int {
    val target = raw.coerceIn(0, source.length)
    var index = 0
    var visible = 0
    var emojiIndex = 0
    while (index < target) {
      val emoji = ranges.getOrNull(emojiIndex)
      if (emoji != null && index == emoji.first) {
        if (target <= emoji.last) return visible
        index = emoji.last + 1
        emojiIndex++
        visible++
      } else {
        if (source[index] != '\u200B') visible++
        index++
      }
    }
    return visible
  }

  /** Keeps the existing earliest-boundary behavior around hidden list anchors. */
  fun sourceOffset(visible: Int): Int {
    val target = visible.coerceAtLeast(0)
    var index = 0
    var rendered = 0
    var emojiIndex = 0
    while (index < source.length && rendered < target) {
      val emoji = ranges.getOrNull(emojiIndex)
      if (emoji != null && index == emoji.first) {
        index = emoji.last + 1
        emojiIndex++
        rendered++
      } else {
        if (source[index] != '\u200B') rendered++
        index++
      }
    }
    return index
  }

  /** Returns an ordered replacement range, expanding any endpoint inside a shortcode. */
  fun atomicEmojiRange(
    start: Int,
    end: Int,
  ): Pair<Int, Int> {
    var lower = minOf(start, end).coerceIn(0, source.length)
    var upper = maxOf(start, end).coerceIn(0, source.length)
    for (emoji in ranges) {
      if (lower > emoji.first && lower <= emoji.last) lower = emoji.first
      if (upper > emoji.first && upper <= emoji.last) upper = emoji.last + 1
    }
    return lower to upper
  }
}

private fun CharSequence.customEmojiCoordinates(): CustomEmojiCoordinates {
  val ranges =
    if (this is Spanned) {
      getSpans(0, length, EnrichedInputCustomEmojiSpan::class.java)
        .mapNotNull { span ->
          val start = getSpanStart(span)
          val end = getSpanEnd(span)
          if (start >= 0 && end > start && end <= length) start until end else null
        }
    } else {
      emptyList()
    }
  return CustomEmojiCoordinates(this, ranges)
}

internal fun CharSequence.renderedText(): String = customEmojiCoordinates().renderedText()

internal fun CharSequence.renderedOffset(raw: Int): Int = customEmojiCoordinates().renderedOffset(raw)

internal fun CharSequence.sourceOffset(visible: Int): Int = customEmojiCoordinates().sourceOffset(visible)

internal fun CharSequence.atomicEmojiRange(
  start: Int,
  end: Int,
): Pair<Int, Int> = customEmojiCoordinates().atomicEmojiRange(start, end)
