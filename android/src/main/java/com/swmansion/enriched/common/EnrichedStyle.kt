package com.swmansion.enriched.common

interface EnrichedStyle {
  // Headers
  val h1FontSize: Int
  val h1Bold: Boolean
  val h2FontSize: Int
  val h2Bold: Boolean
  val h3FontSize: Int
  val h3Bold: Boolean
  val h4FontSize: Int
  val h4Bold: Boolean
  val h5FontSize: Int
  val h5Bold: Boolean
  val h6FontSize: Int
  val h6Bold: Boolean

  // Blockquote
  val blockquoteColor: Int?
  val blockquoteBorderColor: Int
  val blockquoteStripeWidth: Int
  val blockquoteGapWidth: Int

  // Ordered Lists
  val olGapWidth: Float
  val olMarginLeft: Float
  val olMarkerFontWeight: Int?
  val olMarkerColor: Int?

  // Unordered Lists
  val ulGapWidth: Float
  val ulMarginLeft: Float
  val ulBulletSize: Float
  val ulBulletColor: Int

  // Checkbox list
  val ulCheckboxBoxSize: Float
  val ulCheckboxGapWidth: Float
  val ulCheckboxMarginLeft: Float
  val ulCheckboxBoxColor: Int

  // Links
  val aColor: Int
  val aUnderline: Boolean

  // Code Blocks
  val codeBlockColor: Int
  val codeBlockBackgroundColor: Int
  val codeBlockRadius: Float

  // Inline Code
  val inlineCodeColor: Int
  val inlineCodeBackgroundColor: Int

  // Mentions
  val mentionsStyle: Map<String, MentionStyle>
}
