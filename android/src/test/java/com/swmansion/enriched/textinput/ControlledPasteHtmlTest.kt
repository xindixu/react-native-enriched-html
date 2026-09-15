package com.swmansion.enriched.textinput

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ControlledPasteHtmlTest {
  @Test
  fun `wraps an html fragment as a parser document`() {
    assertEquals(
      "<html><p><b>x</b></p></html>",
      controlledPasteHtmlDocument("<p><b>x</b></p>"),
    )
  }

  @Test
  fun `preserves a complete html document`() {
    val document = "<html><p><b>x</b></p></html>"

    assertEquals(document, controlledPasteHtmlDocument(document))
  }

  @Test
  fun `image html retains default paste including mixed content and missing alt`() {
    listOf(
      "<img>",
      "<img/>",
      "<IMG SRC=\"https://example.com/photo.png\">",
      "<html><p>caption<img src=\"photo.png\"></p></html>",
      "<p>before</p><img\nsrc=\"photo.png\"><p>after</p>",
    ).forEach { assertTrue(it, containsPasteImage(it)) }
  }

  @Test
  fun `text and escaped image markup remain eligible for normalization`() {
    listOf(null, "", "<p>text</p>", "&lt;img src=photo.png&gt;", "<imgplaceholder>")
      .forEach { assertFalse(it, containsPasteImage(it)) }
  }
}
