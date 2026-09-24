package com.swmansion.enriched.textinput.events

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

class OnCustomEmojiErrorEvent(
  surfaceId: Int,
  viewId: Int,
  private val shortcode: String,
  private val uri: String,
) : Event<OnCustomEmojiErrorEvent>(surfaceId, viewId) {
  override fun getEventName(): String = EVENT_NAME

  override fun canCoalesce(): Boolean = false

  override fun getEventData(): WritableMap =
    Arguments.createMap().apply {
      putString("shortcode", shortcode)
      putString("uri", uri)
    }

  companion object {
    const val EVENT_NAME = "onCustomEmojiError"
  }
}
