package com.swmansion.enriched.textinput

internal fun controlledPasteHtmlDocument(html: String): String = if (html.startsWith("<html>")) html else "<html>$html</html>"

private val pasteImageTag = Regex("<img(?=[\\s/>])", RegexOption.IGNORE_CASE)

internal fun containsPasteImage(html: String?): Boolean = html != null && pasteImageTag.containsMatchIn(html)
