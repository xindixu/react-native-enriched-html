package com.swmansion.enriched.textinput.watchers

import android.text.Editable
import android.text.Spannable
import android.text.TextWatcher
import com.swmansion.enriched.common.EnrichedConstants
import com.swmansion.enriched.textinput.EnrichedTextInputView
import com.swmansion.enriched.textinput.spans.EnrichedInputAlignmentSpan
import com.swmansion.enriched.textinput.spans.EnrichedSpans

class EnrichedTextWatcher(
  private val view: EnrichedTextInputView,
) : TextWatcher {
  private var endCursorPosition: Int = 0
  private var startCursorPosition: Int = 0
  private var previousTextLength: Int = 0

  private var deletedText: String = ""
  private var anchorAlignmentToRestore: String? = null

  override fun beforeTextChanged(
    s: CharSequence?,
    start: Int,
    count: Int,
    after: Int,
  ) {
    previousTextLength = s?.length ?: 0
    deletedText = if (count > 0 && s != null) s.substring(start, start + count) else ""

    anchorAlignmentToRestore = null

    // When a ZWS is being deleted, check whether it was anchoring a list or paragraph
    // style. If so, capture the co-located alignment value so AlignmentStyles can
    // re-anchor it after the deletion completes.
    if (deletedText == EnrichedConstants.ZWS_STRING && s is Spannable) {
      val isBlockAnchor =
        EnrichedSpans.listSpans.values
          .any { config -> s.getSpans(start, start + 1, config.clazz).isNotEmpty() } ||
          EnrichedSpans.paragraphSpans.values
            .any { config -> s.getSpans(start, start + 1, config.clazz).isNotEmpty() }

      if (isBlockAnchor) {
        anchorAlignmentToRestore =
          s
            .getSpans(start, start + 1, EnrichedInputAlignmentSpan::class.java)
            .firstOrNull()
            ?.cssValue
      }
    }
  }

  override fun onTextChanged(
    s: CharSequence?,
    start: Int,
    before: Int,
    count: Int,
  ) {
    view.invalidatePendingPaste()
    view.onDocumentTextMutation()
    startCursorPosition = start
    endCursorPosition = start + count
    view.layoutManager.invalidateLayout()
    view.isRemovingMany = !view.isDuringTransaction && before > count + 1
  }

  override fun afterTextChanged(s: Editable?) {
    if (s == null) return
    if (view.isDuringTransaction) return
    applyStyles(s)
    view.refreshCustomEmojis()
    emitEvents(s)
    view.layoutManager.invalidateLayout()
  }

  private fun applyStyles(s: Editable) {
    view.inlineStyles?.afterTextChanged(s, startCursorPosition, endCursorPosition)
    view.paragraphStyles?.afterTextChanged(s, endCursorPosition, previousTextLength)
    view.listStyles?.afterTextChanged(s, endCursorPosition, previousTextLength)
    view.alignmentStyles?.afterTextChanged(s, endCursorPosition, deletedText, anchorAlignmentToRestore)
    view.shortcutsHandler?.afterTextChanged(s, endCursorPosition, previousTextLength)
    view.parametrizedStyles?.afterTextChanged(s, startCursorPosition, endCursorPosition)
  }

  private fun emitChangeText() {
    view.emitRenderedText()
  }

  private fun emitEvents(s: Editable) {
    emitChangeText()
    if (!view.isReconcilingRichPasteUndo) {
      view.spanWatcher?.emitEvent(s, null)
    }
  }
}
