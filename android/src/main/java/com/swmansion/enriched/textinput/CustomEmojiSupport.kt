package com.swmansion.enriched.textinput

import android.text.Spannable
import com.swmansion.enriched.common.spans.EnrichedCodeBlockSpan
import com.swmansion.enriched.common.spans.EnrichedInlineCodeSpan
import com.swmansion.enriched.common.spans.EnrichedMentionSpan
import com.swmansion.enriched.textinput.spans.EnrichedInputCustomEmojiSpan
import com.swmansion.enriched.textinput.spans.interfaces.EnrichedInputSpan

/** Reconciles presentation only; native text edits and their undo records stay intact. */
class CustomEmojiSupport(
  private val view: EnrichedTextInputView,
  private val onError: (String, String) -> Unit = { _, _ -> },
) {
  private var catalog: Map<String, String> = emptyMap()
  private val failedUris = mutableSetOf<String>()
  private var refreshing = false
  private val activeSpans = mutableSetOf<EnrichedInputCustomEmojiSpan>()

  fun setCatalog(entries: Map<String, String>) {
    catalog = entries.toMap()
  }

  fun refresh() {
    val text = view.text ?: return
    if (refreshing) return
    refreshing = true
    try {
      val composing =
        text.getSpans(0, text.length, Any::class.java).filter {
          text.getSpanFlags(it) and Spannable.SPAN_COMPOSING != 0
        }
      if (composing.isNotEmpty()) {
        val emojis = text.getSpans(0, text.length, EnrichedInputCustomEmojiSpan::class.java)
        emojis
          .filter { emoji ->
            composing.any {
              text.getSpanStart(it) < text.getSpanEnd(emoji) && text.getSpanEnd(it) > text.getSpanStart(emoji)
            }
          }.forEach {
            text.removeSpan(it)
            it.dispose()
            activeSpans.remove(it)
          }
        return
      }
      val existing = text.getSpans(0, text.length, EnrichedInputCustomEmojiSpan::class.java).toMutableList()
      (activeSpans - existing.toSet()).forEach { it.dispose() }
      activeSpans.retainAll(existing.toSet())
      for (match in findMatches(text.toString())) {
        val shortcode = match.value
        val uri = catalog[shortcode]?.takeIf { it.isNotEmpty() } ?: continue
        val start = match.range.first
        val end = match.range.last + 1
        val spans =
          text.getSpans(start, end, EnrichedInputSpan::class.java).filter {
            text.getSpanStart(it) < end && text.getSpanEnd(it) > start && it !is EnrichedInputCustomEmojiSpan
          }
        if (spans.any {
            it is EnrichedInlineCodeSpan || it is EnrichedCodeBlockSpan ||
              (
                it is EnrichedMentionSpan && (
                  it.getIndicator() != ":" || it.getText() != shortcode ||
                    text.getSpanStart(it) != start || text.getSpanEnd(it) != end
                )
              ) ||
              text.getSpanStart(it) > start || text.getSpanEnd(it) < end
          }
        ) {
          continue
        }
        spans.filterIsInstance<EnrichedMentionSpan>().forEach { text.removeSpan(it) }
        val preserved =
          existing.firstOrNull {
            it in activeSpans && text.getSpanStart(it) == start && text.getSpanEnd(it) == end && it.shortcode == shortcode && it.uri == uri
          }
        if (preserved != null) {
          existing.remove(preserved)
          continue
        }
        val span =
          EnrichedInputCustomEmojiSpan(shortcode, uri, view, uri in failedUris) { failedShortcode, failedUri ->
            if (failedUris.add(failedUri) && catalog[failedShortcode] == failedUri) onError(failedShortcode, failedUri)
          }
        text.setSpan(span, start, end, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
        activeSpans.add(span)
      }
      existing.forEach {
        text.removeSpan(it)
        it.dispose()
        activeSpans.remove(it)
      }
    } finally {
      refreshing = false
    }
  }

  fun dispose() {
    activeSpans.forEach { it.dispose() }
    activeSpans.clear()
  }

  companion object {
    private val token = Regex(":[a-z0-9][a-z0-9_-]{0,63}:(?![\\p{L}\\p{M}\\p{N}_])")
    private val word = Regex("[\\p{L}\\p{M}\\p{N}_]")

    // Java regex lookbehind does not reliably recognize supplementary letters.
    fun findMatches(source: String): Sequence<MatchResult> =
      token.findAll(source).filter { match ->
        val start = match.range.first
        val end = match.range.last + 1
        (start == 0 || !isWord(Character.codePointBefore(source, start))) &&
          (end == source.length || !isWord(Character.codePointAt(source, end)))
      }

    private fun isWord(codePoint: Int): Boolean = word.matches(String(Character.toChars(codePoint)))
  }
}
