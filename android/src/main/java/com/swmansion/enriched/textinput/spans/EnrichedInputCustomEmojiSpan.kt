package com.swmansion.enriched.textinput.spans

import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.drawable.Drawable
import android.os.Build
import android.os.SystemClock
import android.text.Spannable
import android.text.style.ReplacementSpan
import com.swmansion.enriched.common.AsyncDrawable
import com.swmansion.enriched.common.ForceRedrawSpan
import com.swmansion.enriched.textinput.EnrichedTextInputView
import com.swmansion.enriched.textinput.spans.interfaces.EnrichedInputSpan
import com.swmansion.enriched.textinput.styles.HtmlStyle
import java.lang.ref.WeakReference
import kotlin.math.ceil

/** The shortcode stays in the Editable for native undo, clipboard and length limits. */
class EnrichedInputCustomEmojiSpan(
  val shortcode: String,
  val uri: String,
  view: EnrichedTextInputView,
  initiallyFailed: Boolean = false,
  onError: (String, String) -> Unit,
) : ReplacementSpan(),
  EnrichedInputSpan,
  Drawable.Callback {
  private val owner = WeakReference(view)
  private var failed = initiallyFailed
  private val drawable =
    if (initiallyFailed) {
      null
    } else {
      AsyncDrawable(uri, preserveAspectRatio = true) { success ->
        failed = !success
        if (!success) onError(shortcode, uri)
        // Failure changes the measured width from the image box to literal text.
        val editable = owner.get()?.text
        if (editable != null) {
          val start = editable.getSpanStart(this)
          val end = editable.getSpanEnd(this)
          if (start >= 0 && end > start) {
            val redraw = ForceRedrawSpan()
            editable.setSpan(redraw, start, end, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
            editable.removeSpan(redraw)
          }
        }
        owner.get()?.layoutManager?.invalidateLayout()
        owner.get()?.requestLayout()
        owner.get()?.invalidate()
      }.also { it.callback = this }
    }

  init {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) contentDescription = shortcode
  }

  override val dependsOnHtmlStyle = false

  override fun rebuildWithStyle(htmlStyle: HtmlStyle): EnrichedInputCustomEmojiSpan = this

  override fun getSize(
    paint: Paint,
    text: CharSequence?,
    start: Int,
    end: Int,
    fm: Paint.FontMetricsInt?,
  ): Int {
    val metrics = paint.fontMetricsInt
    if (fm != null) {
      fm.ascent = metrics.ascent
      fm.descent = metrics.descent
      fm.top = metrics.top
      fm.bottom = metrics.bottom
      fm.leading = metrics.leading
      if (!failed) {
        val boxTop = metrics.descent - size(paint)
        fm.ascent = minOf(fm.ascent, boxTop)
        fm.top = minOf(fm.top, boxTop)
      }
    }
    return if (failed) ceil(paint.measureText(shortcode)).toInt() else size(paint)
  }

  override fun draw(
    canvas: Canvas,
    text: CharSequence?,
    start: Int,
    end: Int,
    x: Float,
    top: Int,
    y: Int,
    bottom: Int,
    paint: Paint,
  ) {
    if (failed) {
      canvas.drawText(shortcode, x, y.toFloat(), paint)
    } else {
      val box = size(paint)
      drawable?.setBounds(0, 0, box, box)
      val save = canvas.save()
      canvas.translate(x, (y + paint.fontMetricsInt.descent - box).toFloat())
      drawable?.draw(canvas)
      canvas.restoreToCount(save)
    }
  }

  private fun size(paint: Paint): Int = ceil(paint.textSize * 1.25f).toInt().coerceAtLeast(1)

  fun dispose() {
    drawable?.dispose()
  }

  override fun invalidateDrawable(who: Drawable) {
    owner.get()?.invalidate()
  }

  override fun scheduleDrawable(
    who: Drawable,
    what: Runnable,
    `when`: Long,
  ) {
    owner.get()?.postDelayed(what, (`when` - SystemClock.uptimeMillis()).coerceAtLeast(0))
  }

  override fun unscheduleDrawable(
    who: Drawable,
    what: Runnable,
  ) {
    owner.get()?.removeCallbacks(what)
  }
}
