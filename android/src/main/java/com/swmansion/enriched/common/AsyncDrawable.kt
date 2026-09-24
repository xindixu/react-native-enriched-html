package com.swmansion.enriched.common

import android.content.res.Resources
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorFilter
import android.graphics.ImageDecoder
import android.graphics.PixelFormat
import android.graphics.drawable.AnimatedImageDrawable
import android.graphics.drawable.Drawable
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.graphics.drawable.toDrawable
import com.swmansion.enriched.R
import java.net.URL
import java.nio.ByteBuffer
import java.util.concurrent.Executors

class AsyncDrawable(
  private val url: String,
  private val preserveAspectRatio: Boolean = false,
  private val onResult: ((Boolean) -> Unit)? = null,
) : Drawable(),
  Drawable.Callback {
  private var internalDrawable: Drawable = Color.TRANSPARENT.toDrawable()
  private val mainHandler = Handler(Looper.getMainLooper())
  private var disposed = false
  var isLoaded = false
    private set

  init {
    load()
  }

  private fun load() {
    executor.execute {
      val drawable =
        try {
          val connection = URL(url).openConnection()
          connection.connectTimeout = 15000
          connection.readTimeout = 15000
          val bytes = connection.getInputStream().use { it.readBytes() }
          prepareDrawable(bytes)
        } catch (e: Exception) {
          Log.e("AsyncDrawable", "Failed to load: $url", e)
          null
        }
      mainHandler.post {
        if (!disposed) {
          internalDrawable =
            drawable
              ?: if (onResult != null) Color.TRANSPARENT.toDrawable() else ResourceManager.getDrawableResource(R.drawable.broken_image)
          internalDrawable.callback = this
          updateInternalBounds()
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && internalDrawable is AnimatedImageDrawable) {
            (internalDrawable as AnimatedImageDrawable).apply {
              repeatCount = AnimatedImageDrawable.REPEAT_INFINITE
              start()
            }
          }
          isLoaded = true
          onResult?.invoke(drawable != null)
          onLoaded?.invoke()
          invalidateSelf()
        }
      }
    }
  }

  private fun prepareDrawable(bytes: ByteArray): Drawable? {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      try {
        val source = ImageDecoder.createSource(ByteBuffer.wrap(bytes))
        return ImageDecoder.decodeDrawable(source) { decoder, _, _ ->
          if (!preserveAspectRatio && bounds.width() > 0 && bounds.height() > 0) {
            decoder.setTargetSize(bounds.width(), bounds.height())
          }
        }
      } catch (e: Exception) {
        Log.w("AsyncDrawable", "ImageDecoder failed, falling back to Bitmap", e)
      }
    }
    return BitmapFactory.decodeByteArray(bytes, 0, bytes.size)?.toDrawable(Resources.getSystem())
  }

  private fun updateInternalBounds() {
    val width = internalDrawable.intrinsicWidth
    val height = internalDrawable.intrinsicHeight
    if (preserveAspectRatio && width > 0 && height > 0) {
      val scale = minOf(bounds.width().toFloat() / width, bounds.height().toFloat() / height)
      val scaledWidth = (width * scale).toInt()
      val scaledHeight = (height * scale).toInt()
      val left = bounds.left + (bounds.width() - scaledWidth) / 2
      val top = bounds.top + (bounds.height() - scaledHeight) / 2
      internalDrawable.setBounds(left, top, left + scaledWidth, top + scaledHeight)
    } else {
      internalDrawable.bounds = bounds
    }
  }

  fun dispose() {
    disposed = true
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && internalDrawable is AnimatedImageDrawable) {
      (internalDrawable as AnimatedImageDrawable).stop()
    }
    internalDrawable.callback = null
    callback = null
  }

  override fun invalidateDrawable(who: Drawable) = invalidateSelf()

  override fun scheduleDrawable(
    who: Drawable,
    what: Runnable,
    `when`: Long,
  ) = scheduleSelf(what, `when`)

  override fun unscheduleDrawable(
    who: Drawable,
    what: Runnable,
  ) = unscheduleSelf(what)

  override fun draw(canvas: Canvas) = internalDrawable.draw(canvas)

  override fun setAlpha(alpha: Int) {
    internalDrawable.alpha = alpha
  }

  override fun setColorFilter(colorFilter: ColorFilter?) {
    internalDrawable.colorFilter = colorFilter
  }

  @Deprecated("Deprecated in Java")
  override fun getOpacity(): Int = PixelFormat.TRANSLUCENT

  override fun setBounds(
    left: Int,
    top: Int,
    right: Int,
    bottom: Int,
  ) {
    super.setBounds(left, top, right, bottom)
    updateInternalBounds()
  }

  var onLoaded: (() -> Unit)? = null

  companion object {
    private val executor = Executors.newFixedThreadPool(4)
  }
}
