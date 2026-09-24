package com.swmansion.enriched.textinput

import android.graphics.drawable.Animatable
import android.graphics.drawable.Drawable
import android.os.Looper
import android.util.Base64
import com.swmansion.enriched.common.AsyncDrawable
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [24, 27], shadows = [LegacyMovieShadow::class])
class LegacyEmojiAnimationTest {
  @get:Rule val files = TemporaryFolder()

  @Test
  fun `GIF custom emoji remains animated before ImageDecoder is available`() {
    val file = files.newFile("emoji.gif")
    file.writeBytes(
      Base64.decode("R0lGODlhAQABAIAAAAAAAP///yH5BAAKAAAALAAAAAABAAEAAAICRAEAIfkEAAoAAAAsAAAAAAEAAQAAAgJMAQA7", Base64.DEFAULT),
    )
    var loaded = false
    val drawable = AsyncDrawable(file.toURI().toString(), preserveAspectRatio = true) { loaded = it }
    drawable.setBounds(0, 0, 24, 24)
    val deadline = System.nanoTime() + 5_000_000_000L
    while (!drawable.isLoaded && System.nanoTime() < deadline) {
      shadowOf(Looper.getMainLooper()).idle()
      Thread.sleep(10)
    }
    shadowOf(Looper.getMainLooper()).idle()
    assertTrue(loaded)
    val field = AsyncDrawable::class.java.getDeclaredField("internalDrawable").apply { isAccessible = true }
    val decoded = field.get(drawable) as Drawable
    assertTrue("GIF must animate on API 27", decoded is Animatable)
    assertTrue((decoded as Animatable).isRunning)
    var scheduled: Runnable? = null
    var invalidations = 0
    var unscheduled = false
    val callback =
      object : Drawable.Callback {
        override fun invalidateDrawable(who: Drawable) {
          invalidations++
        }

        override fun scheduleDrawable(
          who: Drawable,
          what: Runnable,
          `when`: Long,
        ) {
          scheduled = what
        }

        override fun unscheduleDrawable(
          who: Drawable,
          what: Runnable,
        ) {
          unscheduled = true
        }
      }
    drawable.callback = callback
    org.junit.Assert.assertEquals(android.graphics.Rect(0, 0, 24, 24), decoded.bounds)
    val bitmap = android.graphics.Bitmap.createBitmap(24, 24, android.graphics.Bitmap.Config.ARGB_8888)
    drawable.draw(android.graphics.Canvas(bitmap))
    org.junit.Assert.assertNotNull("drawing schedules the next GIF frame", scheduled)
    scheduled!!.run()
    assertTrue(invalidations > 0)
    org.junit.Assert.assertSame(callback, drawable.callback)
    drawable.dispose()
    assertTrue(unscheduled)
    bitmap.recycle()
    org.junit.Assert.assertFalse(decoded.isRunning)
  }
}

// Robolectric does not implement Movie's native GIF codec. Keep that codec boundary
// separate while exercising real API-version selection, drawable scheduling and disposal.
@org.robolectric.annotation.Implements(android.graphics.Movie::class)
class LegacyMovieShadow {
  companion object {
    @JvmStatic
    @org.robolectric.annotation.Implementation
    fun decodeByteArray(
      data: ByteArray,
      offset: Int,
      length: Int,
    ): android.graphics.Movie? =
      if (String(data, offset, 3, Charsets.US_ASCII) ==
        "GIF"
      ) {
        org.robolectric.shadow.api.Shadow
          .newInstanceOf(android.graphics.Movie::class.java)
      } else {
        null
      }
  }

  @org.robolectric.annotation.Implementation fun width(): Int = 1

  @org.robolectric.annotation.Implementation fun height(): Int = 1

  @org.robolectric.annotation.Implementation fun duration(): Int = 200

  @org.robolectric.annotation.Implementation fun setTime(time: Int): Boolean = true
}
