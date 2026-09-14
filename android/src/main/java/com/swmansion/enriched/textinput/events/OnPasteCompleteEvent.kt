package com.swmansion.enriched.textinput.events

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

class OnPasteCompleteEvent(
  surfaceId: Int,
  viewId: Int,
  private val requestId: String,
  private val applied: Boolean,
  private val experimentalSynchronousEvents: Boolean,
) : Event<OnPasteCompleteEvent>(surfaceId, viewId) {
  override fun getEventName(): String = EVENT_NAME

  override fun canCoalesce(): Boolean = false

  override fun getEventData(): WritableMap =
    Arguments.createMap().apply {
      putString("requestId", requestId)
      putBoolean("applied", applied)
    }

  override fun experimental_isSynchronous(): Boolean = experimentalSynchronousEvents

  companion object {
    const val EVENT_NAME: String = "onPasteComplete"
  }
}
