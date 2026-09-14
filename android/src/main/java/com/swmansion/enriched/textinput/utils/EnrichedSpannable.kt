package com.swmansion.enriched.textinput.utils

import android.text.Editable
import android.text.Spannable
import android.text.SpannableString
import android.text.SpannableStringBuilder
import com.swmansion.enriched.common.EnrichedSpanFlags
import com.swmansion.enriched.common.spans.interfaces.EnrichedBlockSpan
import com.swmansion.enriched.common.spans.interfaces.EnrichedParagraphSpan
import com.swmansion.enriched.common.spans.interfaces.EnrichedSpan
import com.swmansion.enriched.textinput.spans.EnrichedSpans
import com.swmansion.enriched.textinput.styles.HtmlStyle

fun Spannable.getSafeSpanBoundaries(
  start: Int,
  end: Int,
): Pair<Int, Int> {
  val safeStart = start.coerceAtMost(end).coerceAtLeast(0)
  val safeEnd = end.coerceAtLeast(start).coerceAtMost(this.length)

  return Pair(safeStart, safeEnd)
}

fun Spannable.getParagraphBounds(
  start: Int,
  end: Int,
): Pair<Int, Int> {
  var startPosition = start.coerceAtLeast(0).coerceAtMost(this.length)
  var endPosition = end.coerceAtLeast(0).coerceAtMost(this.length)

  // Find the start of the paragraph
  while (startPosition > 0 && this[startPosition - 1] != '\n') {
    startPosition--
  }

  // Find the end of the paragraph
  while (endPosition < this.length && this[endPosition] != '\n') {
    endPosition++
  }

  if (startPosition >= endPosition) {
    // If the start position is equal or greater than the end position, return the same position
    startPosition = endPosition
  }

  return Pair(startPosition, endPosition)
}

fun Spannable.getParagraphBounds(index: Int): Pair<Int, Int> = this.getParagraphBounds(index, index)

private fun Spannable.hasStyleInRange(
  style: String,
  start: Int,
  end: Int,
): Boolean {
  val type = EnrichedSpans.allSpans[style]?.clazz ?: return false
  return getSpans(start, end, type).isNotEmpty()
}

private fun getStyleForSpan(span: EnrichedSpan): String? =
  EnrichedSpans.allSpans.entries
    .firstOrNull { (_, config) ->
      config.clazz.isInstance(span)
    }?.key

private fun Spannable.removeBlockedPasteStyles(
  start: Int,
  pastedSpannable: Spannable,
  htmlStyle: HtmlStyle,
): Spannable {
  val pastedSpans = pastedSpannable.getSpans(0, pastedSpannable.length, EnrichedSpan::class.java)

  for (span in pastedSpans) {
    val style = getStyleForSpan(span) ?: continue
    val blockingStyles = EnrichedSpans.getMergingConfigForStyle(style, htmlStyle)?.blockingStyles ?: continue
    if (blockingStyles.isEmpty()) continue

    val spanStart = pastedSpannable.getSpanStart(span)
    val spanEnd = pastedSpannable.getSpanEnd(span)
    if (spanStart == -1 || spanEnd == -1 || spanStart == spanEnd) continue

    val pastedStart = start + spanStart
    val pastedEnd = start + spanEnd
    if (blockingStyles.any { hasStyleInRange(it, pastedStart, pastedEnd) }) {
      removeSpan(span)
    }
  }

  return this
}

fun Spannable.mergeSpannables(
  start: Int,
  end: Int,
  string: String,
  htmlStyle: HtmlStyle? = null,
): Spannable = this.mergeSpannables(start, end, SpannableString(string), htmlStyle)

fun Spannable.mergeSpannables(
  start: Int,
  end: Int,
  spannable: Spannable,
  htmlStyle: HtmlStyle? = null,
): Spannable {
  val builder = SpannableStringBuilder(this)
  builder.mergeSpannableInPlace(start, end, spannable, htmlStyle)
  return builder
}

fun Editable.mergeSpannableInPlace(
  start: Int,
  end: Int,
  spannable: Spannable,
  htmlStyle: HtmlStyle? = null,
): Int {
  val lengthBefore = length
  var finalStart = start
  var finalEnd = end

  val startBlockSpans = spannable.getSpans(0, 0, EnrichedBlockSpan::class.java)
  val startParagraphSpans = spannable.getSpans(0, 0, EnrichedParagraphSpan::class.java)
  val endBlockSpans = spannable.getSpans(this.length, this.length, EnrichedBlockSpan::class.java)
  val endParagraphSpans = spannable.getSpans(this.length, this.length, EnrichedParagraphSpan::class.java)
  val (paragraphStart, paragraphEnd) = this.getParagraphBounds(start, end)
  val isNewLineStart = startBlockSpans.isNotEmpty() || startParagraphSpans.isNotEmpty()
  val isNewLineEnd = endBlockSpans.isNotEmpty() || endParagraphSpans.isNotEmpty()

  val pastedHasOwnStyles =
    spannable.getSpans(0, spannable.length, EnrichedBlockSpan::class.java).isNotEmpty() ||
      spannable.getSpans(0, spannable.length, EnrichedParagraphSpan::class.java).isNotEmpty()

  if (isNewLineStart && start != paragraphStart) {
    insert(start, "\n")
    finalStart = start + 1
    finalEnd = end + 1
  }

  if (isNewLineEnd && end != paragraphEnd) {
    insert(finalEnd, "\n")
  }

  replace(finalStart, finalEnd, spannable)

  // Manually extend existing paragraph/block spans to cover the pasted text.
  if (!pastedHasOwnStyles) {
    val pasteEnd = finalStart + spannable.length

    val affectedParagraphSpans = getSpans(finalStart, finalStart, EnrichedParagraphSpan::class.java)
    val affectedBlockSpans = getSpans(finalStart, finalStart, EnrichedBlockSpan::class.java)
    val affectedSpans = affectedBlockSpans.toList() + affectedParagraphSpans.toList()

    for (span in affectedSpans) {
      val spanStart = getSpanStart(span)
      val spanEnd = getSpanEnd(span)
      if (spanStart == -1 || spanEnd >= pasteEnd) continue

      val (_, newParagraphEnd) = getParagraphBounds(spanStart, pasteEnd)
      val flags = getSpanFlags(span)
      removeSpan(span)
      setSpan(span, spanStart, newParagraphEnd, EnrichedSpanFlags.forSpan(span, flags))
    }
  }

  htmlStyle?.let {
    removeBlockedPasteStyles(finalStart, spannable, it)
  }

  val insertedLength = length - (lengthBefore - (end - start))
  return (start + insertedLength).coerceIn(0, length)
}
