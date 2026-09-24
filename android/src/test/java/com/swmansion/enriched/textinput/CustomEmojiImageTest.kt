package com.swmansion.enriched.textinput

import android.graphics.Bitmap
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.drawable.Drawable
import android.os.Looper
import com.facebook.react.bridge.BridgeReactContext
import com.facebook.react.uimanager.DisplayMetricsHolder
import com.swmansion.enriched.common.AsyncDrawable
import com.swmansion.enriched.textinput.spans.EnrichedInputCustomEmojiSpan
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotSame
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import java.io.File
import kotlin.math.ceil

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34], shadows = [EmojiArgumentsShadow::class, EmojiUIManagerShadow::class])
class CustomEmojiImageTest {
  @get:Rule
  val files = TemporaryFolder()

  private fun editor(): EnrichedTextInputView {
    val context = BridgeReactContext(RuntimeEnvironment.getApplication())
    DisplayMetricsHolder.initDisplayMetrics(context)
    context.setTheme(androidx.appcompat.R.style.Theme_AppCompat)
    return EnrichedTextInputView(context)
  }

  private fun imageUri(): String {
    val image = files.newFile("emoji.png")
    val bitmap = Bitmap.createBitmap(8, 4, Bitmap.Config.ARGB_8888)
    image.outputStream().use { assertTrue(bitmap.compress(Bitmap.CompressFormat.PNG, 100, it)) }
    bitmap.recycle()
    return image.toURI().toString()
  }

  private fun emojis(view: EnrichedTextInputView) = view.text!!.getSpans(0, view.text!!.length, EnrichedInputCustomEmojiSpan::class.java)

  private fun image(span: EnrichedInputCustomEmojiSpan): AsyncDrawable? {
    val field = EnrichedInputCustomEmojiSpan::class.java.getDeclaredField("drawable")
    field.isAccessible = true
    return field.get(span) as AsyncDrawable?
  }

  private fun decoded(drawable: AsyncDrawable): Drawable {
    val field = AsyncDrawable::class.java.getDeclaredField("internalDrawable")
    field.isAccessible = true
    return field.get(drawable) as Drawable
  }

  private fun await(
    description: String,
    ready: () -> Boolean,
  ) {
    val deadline = System.nanoTime() + 5_000_000_000L
    while (!ready() && System.nanoTime() < deadline) {
      shadowOf(Looper.getMainLooper()).idle()
      Thread.sleep(10)
    }
    shadowOf(Looper.getMainLooper()).idle()
    assertTrue(description, ready())
  }

  @Test
  fun `failed URI reports once for repeated tokens and changed URI recovers without replacing text`() {
    val view = editor()
    view.setText(":party: :party:")
    view.setSelection(view.text!!.length)
    val source = view.text
    val errors = mutableListOf<Pair<String, String>>()
    val support = CustomEmojiSupport(view) { shortcode, uri -> errors.add(shortcode to uri) }
    val missing = File(files.root, "missing.png").toURI().toString()
    support.setCatalog(mapOf(":party:" to missing))
    support.refresh()
    val originalSpans = emojis(view)
    assertEquals(2, originalSpans.size)
    await("both failed image requests completed") { originalSpans.all { image(it)?.isLoaded == true } }
    assertEquals(listOf(":party:" to missing), errors)
    val paint = Paint().apply { textSize = 16f }
    originalSpans.forEach {
      assertEquals(ceil(paint.measureText(":party:")).toInt(), it.getSize(paint, ":party:", 0, 7, null))
    }

    // Recreating tokens for the same failed catalog must keep the literal fallback
    // and must not report another failure for that URI.
    support.setCatalog(emptyMap())
    support.refresh()
    support.setCatalog(mapOf(":party:" to missing))
    support.refresh()
    assertEquals(2, emojis(view).size)
    emojis(view).forEach { assertNull(image(it)) }
    assertEquals(1, errors.size)

    val valid = imageUri()
    support.setCatalog(mapOf(":party:" to valid))
    support.refresh()
    val recovered = emojis(view)
    await("replacement catalog images loaded") { recovered.all { image(it)?.isLoaded == true } }
    assertNotSame(originalSpans.first(), recovered.first())
    recovered.forEach {
      assertEquals(valid, it.uri)
      assertEquals(20, it.getSize(paint, ":party:", 0, 7, null))
    }
    assertEquals(1, errors.size)
    assertSame(source, view.text)
    assertEquals(":party: :party:", view.text.toString())
    assertEquals(15, view.selectionStart)
    support.dispose()
  }

  @Test
  fun `static image fits square bounds without distorting aspect ratio and publishes result on main`() {
    var loaded: Boolean? = null
    var resultLooper: Looper? = null
    val drawable =
      AsyncDrawable(imageUri(), preserveAspectRatio = true) {
        loaded = it
        resultLooper = Looper.myLooper()
      }
    drawable.setBounds(0, 0, 40, 40)
    await("PNG loaded successfully") { drawable.isLoaded }
    assertEquals(true, loaded)
    assertSame(Looper.getMainLooper(), resultLooper)
    assertEquals(Rect(0, 10, 40, 30), decoded(drawable).bounds)
    drawable.setBounds(0, 0, 80, 80)
    assertEquals(Rect(0, 20, 80, 60), decoded(drawable).bounds)
    drawable.dispose()
  }

  @Test
  fun `decoded drawable forwards frame callbacks and dispose detaches callbacks`() {
    val drawable = AsyncDrawable(imageUri(), preserveAspectRatio = true) {}
    await("PNG drawable available") { drawable.isLoaded }
    val child = decoded(drawable)
    var invalidated = false
    var scheduled: Runnable? = null
    var scheduledTime = 0L
    var unscheduled: Runnable? = null
    drawable.callback =
      object : Drawable.Callback {
        override fun invalidateDrawable(who: Drawable) {
          assertSame(drawable, who)
          invalidated = true
        }

        override fun scheduleDrawable(
          who: Drawable,
          what: Runnable,
          `when`: Long,
        ) {
          assertSame(drawable, who)
          scheduled = what
          scheduledTime = `when`
        }

        override fun unscheduleDrawable(
          who: Drawable,
          what: Runnable,
        ) {
          assertSame(drawable, who)
          unscheduled = what
        }
      }
    val frame = Runnable {}
    child.invalidateSelf()
    child.scheduleSelf(frame, 1234L)
    child.unscheduleSelf(frame)
    assertTrue(invalidated)
    assertSame(frame, scheduled)
    assertEquals(1234L, scheduledTime)
    assertSame(frame, unscheduled)
    drawable.dispose()
    assertNull(child.callback)
    assertNull(drawable.callback)
    invalidated = false
    child.invalidateSelf()
    assertFalse(invalidated)
  }
}
