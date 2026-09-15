package com.swmansion.enriched.textinput

internal class RichPasteUndoHistory<T>(
  private val maxSize: Int = DEFAULT_MAX_SIZE,
) {
  private data class Entry<T>(
    val beforeText: String,
    val afterText: String,
    val beforeFingerprint: String,
    val afterFingerprint: String,
    val beforeSnapshot: T,
    val afterSnapshot: T,
  )

  private val entries = mutableListOf<Entry<T>>()
  private var appliedCount = 0

  init {
    require(maxSize > 0)
  }

  fun record(
    beforeText: String,
    afterText: String,
    beforeFingerprint: String,
    afterFingerprint: String,
    beforeSnapshot: T,
    afterSnapshot: T,
  ) {
    onNewEdit()
    entries.add(
      Entry(
        beforeText,
        afterText,
        beforeFingerprint,
        afterFingerprint,
        beforeSnapshot,
        afterSnapshot,
      ),
    )
    appliedCount++
    if (entries.size > maxSize) {
      entries.removeAt(0)
      appliedCount--
    }
  }

  fun afterUndo(
    textBeforeUndo: String,
    textAfterUndo: String,
    fingerprintBeforeUndo: String,
  ): T? {
    val entry = undoCandidate(textBeforeUndo, fingerprintBeforeUndo) ?: return null
    if (textBeforeUndo != entry.afterText || textAfterUndo != entry.beforeText) return null

    appliedCount--
    return entry.beforeSnapshot
  }

  fun afterRedo(
    textBeforeRedo: String,
    textAfterRedo: String,
    fingerprintBeforeRedo: String,
  ): T? {
    val entry = redoCandidate(textBeforeRedo, fingerprintBeforeRedo) ?: return null
    if (textBeforeRedo != entry.beforeText || textAfterRedo != entry.afterText) return null

    appliedCount++
    return entry.afterSnapshot
  }

  fun shouldReconcileUndo(
    text: String,
    fingerprint: String,
  ): Boolean = undoCandidate(text, fingerprint) != null

  fun shouldReconcileRedo(
    text: String,
    fingerprint: String,
  ): Boolean = redoCandidate(text, fingerprint) != null

  fun hasUndoEntries(): Boolean = appliedCount > 0

  fun hasRedoEntries(): Boolean = appliedCount < entries.size

  fun hasEntries(): Boolean = entries.isNotEmpty()

  fun onNewEdit() {
    if (appliedCount < entries.size) {
      entries.subList(appliedCount, entries.size).clear()
    }
  }

  fun clear() {
    entries.clear()
    appliedCount = 0
  }

  private fun undoCandidate(
    text: String,
    fingerprint: String,
  ): Entry<T>? {
    if (appliedCount == 0) return null
    val entry = entries[appliedCount - 1]
    if (text != entry.afterText) return null
    if (fingerprint != entry.afterFingerprint) {
      clear()
      return null
    }
    return entry
  }

  private fun redoCandidate(
    text: String,
    fingerprint: String,
  ): Entry<T>? {
    if (appliedCount == entries.size) return null
    val entry = entries[appliedCount]
    if (text != entry.beforeText) return null
    if (fingerprint != entry.beforeFingerprint) {
      clear()
      return null
    }
    return entry
  }

  private companion object {
    const val DEFAULT_MAX_SIZE = 20
  }
}
