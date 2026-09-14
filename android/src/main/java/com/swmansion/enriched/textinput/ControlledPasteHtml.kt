package com.swmansion.enriched.textinput

internal fun controlledPasteHtmlDocument(html: String): String = if (html.startsWith("<html>")) html else "<html>$html</html>"
