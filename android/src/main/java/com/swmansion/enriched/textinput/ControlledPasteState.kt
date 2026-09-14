package com.swmansion.enriched.textinput

import java.util.UUID

internal data class PendingPaste(
  val requestId: String,
  val start: Int,
  val end: Int,
  val generation: Long,
)

internal class ControlledPasteState(
  private val createRequestId: () -> String = { UUID.randomUUID().toString() },
) {
  var enabled: Boolean = false
    set(value) {
      if (field && !value) invalidate()
      field = value
    }

  var generation: Long = 0
    private set

  private var pending: PendingPaste? = null

  fun capture(
    start: Int,
    end: Int,
  ): PendingPaste? {
    if (!enabled) return null
    if (pending != null) invalidate()

    return PendingPaste(createRequestId(), start, end, generation).also { pending = it }
  }

  fun consume(requestId: String): PendingPaste? {
    val current = pending ?: return null
    if (current.requestId != requestId) return null

    pending = null
    return current.takeIf { it.generation == generation }
  }

  fun invalidate() {
    generation++
    pending = null
  }

  fun recycle() {
    enabled = false
  }
}
