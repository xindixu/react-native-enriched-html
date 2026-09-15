package com.swmansion.enriched.textinput.events

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event
import com.swmansion.enriched.textinput.CaretGeometry

internal class OnCaretChangeEvent(
  surfaceId: Int,
  viewId: Int,
  private val caret: CaretGeometry,
) : Event<OnCaretChangeEvent>(surfaceId, viewId) {
  override fun getEventName(): String = EVENT_NAME

  override fun getEventData(): WritableMap =
    Arguments.createMap().apply {
      putDouble("x", caret.x.toDouble())
      putDouble("y", caret.y.toDouble())
      putDouble("width", 0.0)
      putDouble("height", caret.height.toDouble())
      putBoolean("visible", caret.visible)
    }

  companion object {
    const val EVENT_NAME: String = "onCaretChange"
  }
}
