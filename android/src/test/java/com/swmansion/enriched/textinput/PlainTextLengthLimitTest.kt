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
  fun `mention replacement counts name space and selected query`() {
    assertFalse(acceptsPlainTextReplacement("hey @", 4, 5, "Alice ", 5))
    assertFalse(acceptsPlainTextReplacement("@", 0, 1, "Alice ", 5))
    assertTrue(acceptsPlainTextReplacement("@", 0, 1, "Alice ", 6))
    assertTrue(acceptsPlainTextReplacement("@ ", 0, 1, "Alice", 6))
    assertFalse(acceptsPlainTextReplacement("@ ", 0, 1, "Alice", 5))
    assertTrue(acceptsPlainTextReplacement("hey @Al", 4, 7, "Alice ", 10))
    assertTrue(acceptsPlainTextReplacement("@LongName", 0, 9, "Al ", 3))
    assertFalse(acceptsPlainTextReplacement("@", 0, 1, "😀 ", 2))
    assertTrue(acceptsPlainTextReplacement("@", 0, 1, "😀 ", 3))
  }

  @Test
  fun `link labels respect insertion replacement and non increasing edits`() {
    assertFalse(acceptsPlainTextReplacement("hello", 5, 5, "link", 5))
    assertFalse(acceptsPlainTextReplacement("hello", 0, 5, "longer", 5))
    assertTrue(acceptsPlainTextReplacement("hello", 0, 5, "world", 5))
    assertTrue(acceptsPlainTextReplacement("hello", 0, 5, "hello", 3))
    assertTrue(acceptsPlainTextReplacement("hello", 0, 5, "hi", 3))
    assertTrue(acceptsPlainTextReplacement("hi", 2, 2, "link", 6))
    assertFalse(acceptsPlainTextReplacement("hi", 2, 2, "😀", 3))
    assertTrue(acceptsPlainTextReplacement("hi", 2, 2, "😀", 4))
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
