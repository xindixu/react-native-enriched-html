package com.swmansion.enriched.textinput

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RichPasteUndoHistoryTest {
  private val history = RichPasteUndoHistory<String>()

  @Test
  fun `typing around paste does not move the paste history cursor`() {
    history.record("typed", "typed paste", "before-html", "after-html", "before-rich", "after-rich")

    assertTrue(history.hasUndoEntries())
    assertFalse(history.shouldReconcileUndo("typed paste!", "typed-paste-html"))
    assertNull(history.afterUndo("typed paste!", "typed paste", "typed-paste-html"))
    assertEquals("before-rich", history.afterUndo("typed paste", "typed", "after-html"))
    assertTrue(history.hasRedoEntries())
    assertNull(history.afterRedo("typed", "typed ", "before-html"))
    assertEquals("after-rich", history.afterRedo("typed", "typed paste", "before-html"))
  }

  @Test
  fun `multiple pastes reconcile in native undo order`() {
    history.record("a", "ab", "html-a", "html-ab", "before-1", "after-1")
    history.record("ab", "abc", "html-ab", "html-abc", "before-2", "after-2")

    assertEquals("before-2", history.afterUndo("abc", "ab", "html-abc"))
    assertEquals("before-1", history.afterUndo("ab", "a", "html-ab"))
    assertEquals("after-1", history.afterRedo("a", "ab", "html-a"))
    assertEquals("after-2", history.afterRedo("ab", "abc", "html-ab"))
  }

  @Test
  fun `unrelated undo and redo around a paste do not move the paste cursor`() {
    history.record("A", "AB", "html-a", "html-ab", "before-paste", "after-paste")

    assertEquals("before-paste", history.afterUndo("AB", "A", "html-ab"))
    assertNull(history.afterUndo("A", "", "html-a"))
    assertNull(history.afterRedo("", "A", "html-empty"))
    assertEquals("after-paste", history.afterRedo("A", "AB", "html-a"))
  }

  @Test
  fun `new edit after undo discards rich redo records`() {
    history.record("a", "ab", "html-a", "html-ab", "before", "after")
    assertEquals("before", history.afterUndo("ab", "a", "html-ab"))

    history.onNewEdit()

    assertNull(history.afterRedo("a", "ab", "html-a"))
  }

  @Test
  fun `history reconciles a native same-text transition with distinct rich snapshots`() {
    history.record("same", "same", "plain-html", "bold-html", "plain", "bold")

    assertEquals("plain", history.afterUndo("same", "same", "bold-html"))
    assertEquals("bold", history.afterRedo("same", "same", "plain-html"))
  }

  @Test
  fun `clear removes applied and redo records`() {
    history.record("a", "ab", "html-a", "html-ab", "before", "after")
    history.clear()

    assertFalse(history.hasUndoEntries())
    assertFalse(history.hasRedoEntries())
    assertNull(history.afterUndo("ab", "a", "html-ab"))
    assertNull(history.afterRedo("a", "ab", "html-a"))
  }

  @Test
  fun `a matching text transition with different rich content clears history`() {
    history.record("a", "ab", "html-a", "html-ab", "before", "after")

    assertNull(history.afterUndo("ab", "a", "different-html"))
    assertNull(history.afterUndo("ab", "a", "html-ab"))
  }

  @Test
  fun `history retains only the configured native undo depth`() {
    val boundedHistory = RichPasteUndoHistory<String>(maxSize = 2)
    boundedHistory.record("0", "1", "html-0", "html-1", "before-1", "after-1")
    boundedHistory.record("1", "2", "html-1", "html-2", "before-2", "after-2")
    boundedHistory.record("2", "3", "html-2", "html-3", "before-3", "after-3")

    assertEquals("before-3", boundedHistory.afterUndo("3", "2", "html-3"))
    assertEquals("before-2", boundedHistory.afterUndo("2", "1", "html-2"))
    assertNull(boundedHistory.afterUndo("1", "0", "html-1"))
  }
}
