package com.swmansion.enriched.common

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorFilter
import android.graphics.Movie
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.drawable.Animatable
import android.graphics.drawable.Drawable
import android.os.SystemClock

/** GIF playback on API 24–27, before ImageDecoder. Movie requires a software canvas. */
@Suppress("DEPRECATION")
internal class LegacyGifDrawable(
  private val movie: Movie,
) : Drawable(),
  Animatable {
  private val paint = Paint(Paint.FILTER_BITMAP_FLAG)
  private var frame: Bitmap? = null
  private var running = false
  private var startedAt = 0L
  private val tick = Runnable { if (running) invalidateSelf() }

  override fun getIntrinsicWidth(): Int = movie.width()

  override fun getIntrinsicHeight(): Int = movie.height()

  override fun draw(canvas: Canvas) {
    if (bounds.isEmpty || movie.width() <= 0 || movie.height() <= 0) return
    var bitmap = frame
    if (bitmap == null || bitmap.width != bounds.width() || bitmap.height != bounds.height()) {
      bitmap?.recycle()
      bitmap = Bitmap.createBitmap(bounds.width(), bounds.height(), Bitmap.Config.ARGB_8888)
      frame = bitmap
    }
    bitmap.eraseColor(Color.TRANSPARENT)
    val softwareCanvas = Canvas(bitmap)
    softwareCanvas.scale(bounds.width().toFloat() / movie.width(), bounds.height().toFloat() / movie.height())
    val duration = movie.duration().takeIf { it > 0 } ?: 1000
    movie.setTime(((SystemClock.uptimeMillis() - startedAt) % duration).toInt())
    movie.draw(softwareCanvas, 0f, 0f)
    canvas.drawBitmap(bitmap, null, bounds, paint)
    if (running) scheduleSelf(tick, SystemClock.uptimeMillis() + 16)
  }

  override fun start() {
    if (running) return
    running = true
    startedAt = SystemClock.uptimeMillis()
    invalidateSelf()
  }

  override fun stop() {
    running = false
    unscheduleSelf(tick)
    frame?.recycle()
    frame = null
  }

  override fun isRunning(): Boolean = running

  override fun setAlpha(alpha: Int) {
    paint.alpha = alpha
  }

  override fun setColorFilter(colorFilter: ColorFilter?) {
    paint.colorFilter = colorFilter
  }

  @Deprecated("Deprecated in Java")
  override fun getOpacity(): Int = PixelFormat.TRANSLUCENT
}
