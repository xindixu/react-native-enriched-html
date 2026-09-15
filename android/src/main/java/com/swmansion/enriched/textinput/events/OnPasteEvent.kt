package com.swmansion.enriched.textinput.events

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

class OnPasteEvent(
  surfaceId: Int,
  viewId: Int,
  private val requestId: String,
  private val html: String,
  private val text: String,
  private val experimentalSynchronousEvents: Boolean,
) : Event<OnPasteEvent>(surfaceId, viewId) {
  override fun getEventName(): String = EVENT_NAME

  override fun canCoalesce(): Boolean = false

  override fun getEventData(): WritableMap =
    Arguments.createMap().apply {
      putString("requestId", requestId)
      putString("html", html)
      putString("text", text)
    }

  override fun experimental_isSynchronous(): Boolean = experimentalSynchronousEvents

  companion object {
    const val EVENT_NAME: String = "onPaste"
  }
}
