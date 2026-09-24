package com.swmansion.enriched.textinput

import org.junit.Assert.assertEquals
import org.junit.Test

class CustomEmojiCoordinatesTest {
  @Test
  fun `emoji uses one rendered UTF16 unit while ordinary Unicode remains unchanged`() {
    val coordinates = CustomEmojiCoordinates("a:wave:😀é", listOf(1..6))
    assertEquals("a\uFFFC😀é", coordinates.renderedText())
    assertEquals(1, coordinates.renderedOffset(1))
    assertEquals(1, coordinates.renderedOffset(4))
    assertEquals(2, coordinates.renderedOffset(7))
    assertEquals(7, coordinates.sourceOffset(2))
    for (offset in 0..6) {
      assertEquals(offset, coordinates.renderedOffset(coordinates.sourceOffset(offset)))
    }
  }

  @Test
  fun `list anchors and newlines preserve earliest source boundary policy`() {
    val coordinates = CustomEmojiCoordinates("\u200b:a:\n\u200b:b:\u200b", listOf(1..3, 6..8))
    assertEquals("\uFFFC\n\uFFFC", coordinates.renderedText())
    assertEquals(0, coordinates.sourceOffset(0))
    assertEquals(4, coordinates.sourceOffset(1))
    assertEquals(5, coordinates.sourceOffset(2))
    assertEquals(9, coordinates.sourceOffset(3))
    assertEquals(3, coordinates.renderedOffset(10))
    for (offset in 0..3) {
      assertEquals(offset, coordinates.renderedOffset(coordinates.sourceOffset(offset)))
    }
  }

  @Test
  fun `adjacent emoji boundaries do not absorb the neighboring emoji`() {
    val coordinates = CustomEmojiCoordinates(":a::b:", listOf(0..2, 3..5))
    assertEquals("\uFFFC\uFFFC", coordinates.renderedText())
    assertEquals(3, coordinates.sourceOffset(1))
    assertEquals(0 to 3, coordinates.atomicEmojiRange(2, 3))
    assertEquals(3 to 6, coordinates.atomicEmojiRange(3, 4))
    assertEquals(3 to 3, coordinates.atomicEmojiRange(3, 3))
    assertEquals(0 to 6, coordinates.atomicEmojiRange(2, 4))
  }

  @Test
  fun `partial and reversed selections expand without splitting tokens`() {
    val coordinates = CustomEmojiCoordinates("x:wave:y", listOf(1..6))
    assertEquals(1 to 7, coordinates.atomicEmojiRange(3, 3))
    assertEquals(1 to 7, coordinates.atomicEmojiRange(6, 2))
    assertEquals(0 to 7, coordinates.atomicEmojiRange(0, 3))
    assertEquals(1 to 8, coordinates.atomicEmojiRange(3, 8))
    assertEquals(1 to 7, coordinates.atomicEmojiRange(1, 7))
    assertEquals(0 to 8, coordinates.atomicEmojiRange(-10, 100))
  }

  @Test
  fun `empty text and out of bounds offsets clamp safely`() {
    val empty = CustomEmojiCoordinates("", emptyList())
    assertEquals("", empty.renderedText())
    assertEquals(0, empty.renderedOffset(100))
    assertEquals(0, empty.sourceOffset(-1))
    assertEquals(0 to 0, empty.atomicEmojiRange(100, -1))
    val coordinates = CustomEmojiCoordinates("a:a:z", listOf(1..3))
    assertEquals(0, coordinates.renderedOffset(-1))
    assertEquals(3, coordinates.renderedOffset(100))
    assertEquals(0, coordinates.sourceOffset(-1))
    assertEquals(5, coordinates.sourceOffset(100))
  }

  @Test
  fun `shortcode text without a span stays literal`() {
    val coordinates = CustomEmojiCoordinates("\u200b:a: 😀\n", emptyList())
    assertEquals(":a: 😀\n", coordinates.renderedText())
    assertEquals(4, coordinates.sourceOffset(3))
    assertEquals(2 to 3, coordinates.atomicEmojiRange(2, 3))
  }
}
