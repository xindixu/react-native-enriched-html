package com.swmansion.enriched.textinput

import android.view.KeyEvent
import android.view.inputmethod.InputConnection
import android.view.inputmethod.InputConnectionWrapper
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.swmansion.enriched.textinput.events.OnInputKeyPressEvent

// This class is based on the implementation from Facebook React Native to provide 'onKeyPress' API on android.
// Original source:
// https://github.com/facebook/react-native/blob/v0.83.1/packages/react-native/ReactAndroid/src/main/java/com/facebook/react/views/textinput/ReactEditTextInputConnectionWrapper.kt
class EnrichedTextInputConnectionWrapper(
  target: InputConnection,
  private val reactContext: ReactContext,
  private val editText: EnrichedTextInputView,
  private val experimentalSynchronousEvents: Boolean,
) : InputConnectionWrapper(target, false) {
  private var isBatchEdit = false
  private var key: String? = null

  override fun beginBatchEdit(): Boolean {
    isBatchEdit = true
    return super.beginBatchEdit()
  }

  override fun endBatchEdit(): Boolean {
    isBatchEdit = false
    key?.let { k ->
      dispatchKeyEvent(k)
      key = null
    }
    return super.endBatchEdit()
  }

  override fun setComposingText(
    text: CharSequence,
    newCursorPosition: Int,
  ): Boolean {
    val previousSelectionStart = editText.selectionStart
    val previousSelectionEnd = editText.selectionEnd

    val consumed = withEmojiInput { super.setComposingText(text, newCursorPosition) }

    val currentSelectionStart = editText.selectionStart
    val noPreviousSelection = previousSelectionStart == previousSelectionEnd
    val cursorDidNotMove = currentSelectionStart == previousSelectionStart
    val cursorMovedBackwardsOrAtBeginningOfInput =
      currentSelectionStart < previousSelectionStart || currentSelectionStart <= 0

    val inputKey =
      if (
        cursorMovedBackwardsOrAtBeginningOfInput || (!noPreviousSelection && cursorDidNotMove)
      ) {
        BACKSPACE_KEY_VALUE
      } else {
        editText.text?.get(currentSelectionStart - 1).toString()
      }

    dispatchKeyEventOrEnqueue(inputKey)
    return consumed
  }

  override fun commitText(
    text: CharSequence,
    newCursorPosition: Int,
  ): Boolean {
    var inputKey = text.toString()
    // Assume not a keyPress if length > 1 (or 2 if unicode)
    if (inputKey.length <= 2) {
      if (inputKey.isEmpty()) {
        inputKey = BACKSPACE_KEY_VALUE
      }
      dispatchKeyEventOrEnqueue(inputKey)
    }
    return withEmojiInput { super.commitText(text, newCursorPosition) }
  }

  override fun deleteSurroundingText(
    beforeLength: Int,
    afterLength: Int,
  ): Boolean {
    dispatchKeyEvent(BACKSPACE_KEY_VALUE)
    val start = editText.selectionStart
    val end = editText.selectionEnd
    if (start >= 0 && end >= start && editText.deleteEmojiRange(start - beforeLength, end + afterLength)) return true
    return withEmojiInput { super.deleteSurroundingText(beforeLength, afterLength) }
  }

  override fun finishComposingText(): Boolean = withEmojiInput { super.finishComposingText() }

  override fun setComposingRegion(
    start: Int,
    end: Int,
  ): Boolean = withEmojiInput { super.setComposingRegion(start, end) }

  override fun deleteSurroundingTextInCodePoints(
    beforeLength: Int,
    afterLength: Int,
  ): Boolean {
    val text = editText.text ?: return super.deleteSurroundingTextInCodePoints(beforeLength, afterLength)
    val start = editText.selectionStart
    val end = editText.selectionEnd
    if (start >= 0 && end >= start && beforeLength >= 0 && afterLength >= 0) {
      val before = beforeLength.coerceAtMost(Character.codePointCount(text, 0, start))
      val after = afterLength.coerceAtMost(Character.codePointCount(text, end, text.length))
      if (editText.deleteEmojiRange(
          Character.offsetByCodePoints(text, start, -before),
          Character.offsetByCodePoints(text, end, after),
        )
      ) {
        return true
      }
    }
    return withEmojiInput { super.deleteSurroundingTextInCodePoints(beforeLength, afterLength) }
  }

  private inline fun withEmojiInput(block: () -> Boolean): Boolean {
    editText.emojiInputDepth++
    return try {
      block()
    } finally {
      editText.emojiInputDepth--
      editText.refreshCustomEmojis()
    }
  }

  // Called by SwiftKey when cursor at beginning of input when there is a delete
  // or when enter is pressed anywhere in the text. Whereas stock Android Keyboard calls
  // [InputConnection.deleteSurroundingText] & [InputConnection.commitText]
  // in each case, respectively.
  override fun sendKeyEvent(event: KeyEvent): Boolean {
    if (event.action == KeyEvent.ACTION_DOWN) {
      val isNumberKey = event.unicodeChar in 48..57
      when (event.keyCode) {
        KeyEvent.KEYCODE_DEL -> {
          dispatchKeyEvent(BACKSPACE_KEY_VALUE)
        }

        KeyEvent.KEYCODE_ENTER -> {
          dispatchKeyEvent(ENTER_KEY_VALUE)
        }

        else -> {
          if (isNumberKey) {
            dispatchKeyEvent(event.number.toString())
          }
        }
      }
    }
    return super.sendKeyEvent(event)
  }

  private fun dispatchKeyEventOrEnqueue(inputKey: String) {
    if (isBatchEdit) {
      key = inputKey
    } else {
      dispatchKeyEvent(inputKey)
    }
  }

  private fun dispatchKeyEvent(inputKey: String) {
    val resolvedKey = if (inputKey == NEWLINE_RAW_VALUE) ENTER_KEY_VALUE else inputKey
    val surfaceId = UIManagerHelper.getSurfaceId(editText)
    val eventDispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, editText.id)
    eventDispatcher?.dispatchEvent(
      OnInputKeyPressEvent(
        surfaceId = surfaceId,
        viewId = editText.id,
        key = resolvedKey,
        experimentalSynchronousEvents = experimentalSynchronousEvents,
      ),
    )
  }

  companion object {
    const val NEWLINE_RAW_VALUE: String = "\n"
    const val BACKSPACE_KEY_VALUE: String = "Backspace"
    const val ENTER_KEY_VALUE: String = "Enter"
  }
}
