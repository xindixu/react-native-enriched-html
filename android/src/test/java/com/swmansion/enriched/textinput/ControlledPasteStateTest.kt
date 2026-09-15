package com.swmansion.enriched.textinput

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ControlledPasteStateTest {
  private var nextId = 0
  private val state = ControlledPasteState { "paste-${++nextId}" }

  @Test
  fun `paste capture requires opt in and preserves its range`() {
    assertNull(state.capture(2, 5))

    state.enabled = true
    val pending = state.capture(2, 5)

    assertEquals("paste-1", pending?.requestId)
    assertEquals(2, pending?.start)
    assertEquals(5, pending?.end)
    assertEquals(0L, pending?.generation)
  }

  @Test
  fun `paste capture normalizes a backward selection`() {
    state.enabled = true

    val pending = state.capture(5, 2)

    assertEquals(2, pending?.start)
    assertEquals(5, pending?.end)
  }

  @Test
  fun `new paste replaces old request without letting stale completion consume it`() {
    state.enabled = true
    val oldRequest = state.capture(1, 1)!!
    val currentRequest = state.capture(3, 4)!!

    assertTrue(currentRequest.generation > oldRequest.generation)
    assertNull(state.consume(oldRequest.requestId))
    assertEquals(currentRequest, state.consume(currentRequest.requestId))
    assertNull(state.consume(currentRequest.requestId))
  }

  @Test
  fun `mutation makes a request stale`() {
    state.enabled = true
    val pending = state.capture(0, 0)!!

    state.invalidate()

    assertEquals(1L, state.generation)
    assertNull(state.consume(pending.requestId))
  }

  @Test
  fun `disabling interception invalidates pending request`() {
    state.enabled = true
    val pending = state.capture(0, 0)!!

    state.enabled = false

    assertFalse(state.enabled)
    assertNull(state.consume(pending.requestId))
  }

  @Test
  fun `recycling disables interception and invalidates pending request`() {
    state.enabled = true
    val pending = state.capture(0, 0)!!

    state.recycle()

    assertFalse(state.enabled)
    assertNull(state.consume(pending.requestId))
    assertTrue(state.generation > pending.generation)
  }
}
