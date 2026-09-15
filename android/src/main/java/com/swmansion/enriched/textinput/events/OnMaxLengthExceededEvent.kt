package com.swmansion.enriched.textinput.events

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

class OnMaxLengthExceededEvent(
  surfaceId: Int,
  viewId: Int,
  private val maxLength: Int,
  private val experimentalSynchronousEvents: Boolean,
) : Event<OnMaxLengthExceededEvent>(surfaceId, viewId) {
  override fun getEventName(): String = EVENT_NAME

  override fun canCoalesce(): Boolean = false

  override fun getEventData(): WritableMap =
    Arguments.createMap().apply {
      putInt("maxLength", maxLength)
    }

  override fun experimental_isSynchronous(): Boolean = experimentalSynchronousEvents

  companion object {
    const val EVENT_NAME: String = "onMaxLengthExceeded"
  }
}
