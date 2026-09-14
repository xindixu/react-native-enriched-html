package com.swmansion.enriched.textinput

import org.junit.Assert.assertEquals
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
}
