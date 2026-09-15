package com.swmansion.enriched.textinput

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PlainTextLengthLimitTest {
  @Test
  fun `whole insertion respects boundary replacement and UTF16`() {
    assertTrue(acceptsPlainTextReplacement("hello world", 6, 11, "12345", 11))
    assertFalse(acceptsPlainTextReplacement("hello world", 6, 11, "123456", 11))
    assertFalse(acceptsPlainTextReplacement("hello world", 6, 11, "😀😀😀", 11))
    assertFalse(acceptsPlainTextReplacement("hello world", 6, 11, "ééé", 11))
    assertTrue(acceptsPlainTextReplacement("😀", 0, 2, "ab", 2))
  }

  @Test
  fun `invisible input consumes capacity`() {
    assertFalse(acceptsPlainTextReplacement("\u200bhi", 3, 3, "!", 3))
    assertFalse(acceptsPlainTextReplacement("hi", 2, 2, "\u200b", 2))
    assertFalse(acceptsPlainTextReplacement("hi", 2, 2, "\n!", 3))
    assertFalse(acceptsPlainTextReplacement("hi", 0, 2, "\u200b".repeat(64001), 64000))
    repeat(3) { assertFalse(acceptsPlainTextReplacement("hi", 2, 2, "\u200b", 2)) }
  }

  @Test
  fun `oversized drafts can shrink and default is unlimited`() {
    assertTrue(acceptsPlainTextReplacement("oversized", 0, 1, "", 3))
    assertTrue(acceptsPlainTextReplacement("oversized", 0, 4, "hi", 3))
    assertFalse(acceptsPlainTextReplacement("oversized", 0, 0, "!", 3))
    assertTrue(acceptsPlainTextReplacement("hi", 2, 2, "text", -1))
    assertFalse(acceptsPlainTextReplacement("", 0, 0, "a", 0))
  }
}
