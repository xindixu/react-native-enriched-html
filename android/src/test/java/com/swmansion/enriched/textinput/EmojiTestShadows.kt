package com.swmansion.enriched.textinput

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.EventDispatcher
import org.robolectric.annotation.Implementation
import org.robolectric.annotation.Implements

// Only the JS/JNI transport is replaced; Android editing, spans and undo remain real.
@Implements(Arguments::class)
class EmojiArgumentsShadow {
  companion object {
    @JvmStatic @Implementation
    fun createMap(): WritableMap = JavaOnlyMap()
  }
}

@Implements(UIManagerHelper::class)
class EmojiUIManagerShadow {
  companion object {
    @JvmStatic @Implementation
    fun getEventDispatcherForReactTag(
      context: ReactContext,
      tag: Int,
    ): EventDispatcher? = null
  }
}
