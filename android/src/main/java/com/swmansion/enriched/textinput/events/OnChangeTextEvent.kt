package com.swmansion.enriched.textinput.events

import android.text.Editable
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event
import com.swmansion.enriched.textinput.renderedText

class OnChangeTextEvent(
  surfaceId: Int,
  viewId: Int,
  private val editable: Editable,
  private val experimentalSynchronousEvents: Boolean,
) : Event<OnChangeTextEvent>(surfaceId, viewId) {
  private val value = editable.renderedText()

  override fun getEventName(): String = EVENT_NAME

  override fun getEventData(): WritableMap {
    val eventData: WritableMap = Arguments.createMap()
    eventData.putString("value", value)
    return eventData
  }

  override fun experimental_isSynchronous(): Boolean = experimentalSynchronousEvents

  companion object {
    const val EVENT_NAME: String = "onChangeText"
  }
}
