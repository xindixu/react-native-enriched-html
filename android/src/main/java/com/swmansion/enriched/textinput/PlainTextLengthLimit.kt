package com.swmansion.enriched.textinput

internal fun acceptsPlainTextReplacement(
  current: CharSequence,
  start: Int,
  end: Int,
  replacement: CharSequence,
  maxLength: Int,
): Boolean {
  val resultLength = current.length - (end - start) + replacement.length
  return maxLength < 0 || resultLength <= maxLength || resultLength <= current.length
}
