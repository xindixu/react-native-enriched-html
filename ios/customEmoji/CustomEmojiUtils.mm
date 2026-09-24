#import "CustomEmojiUtils.h"
#import "MentionParams.h"

NSString *const CustomEmojiAttributeName = @"EnrichedCustomEmoji";

// Attribute runs can coalesce when the same attachment is copied twice.
static void EnumerateEmojis(NSAttributedString *text, BOOL reverse,
                            void (^block)(CustomEmojiAttachment *,
                                          NSUInteger)) {
  [text enumerateAttribute:NSAttachmentAttributeName
                   inRange:NSMakeRange(0, text.length)
                   options:reverse ? NSAttributedStringEnumerationReverse : 0
                usingBlock:^(id value, NSRange range, BOOL *stop) {
                  if (![value isKindOfClass:CustomEmojiAttachment.class])
                    return;
                  for (NSUInteger n = 0; n < range.length; n++) {
                    NSUInteger i = reverse ? NSMaxRange(range) - n - 1
                                           : range.location + n;
                    if ([text.string characterAtIndex:i] == 0xFFFC)
                      block(value, i);
                  }
                }];
}

@implementation CustomEmojiUtils
+ (NSMutableAttributedString *)expandedText:(NSAttributedString *)text {
  NSMutableAttributedString *result = [text mutableCopy];
  EnumerateEmojis(text, YES, ^(CustomEmojiAttachment *emoji, NSUInteger index) {
    NSMutableDictionary *attrs = [[text attributesAtIndex:index
                                           effectiveRange:NULL] mutableCopy];
    [attrs removeObjectForKey:NSAttachmentAttributeName];
    attrs[CustomEmojiAttributeName] = emoji.shortcode;
    [result replaceCharactersInRange:NSMakeRange(index, 1)
                withAttributedString:[[NSAttributedString alloc]
                                         initWithString:emoji.shortcode
                                             attributes:attrs]];
  });
  return result;
}

+ (NSRange)expandedRange:(NSRange)range inText:(NSAttributedString *)text {
  __block NSUInteger start = range.location, end = NSMaxRange(range);
  EnumerateEmojis(text, NO, ^(CustomEmojiAttachment *emoji, NSUInteger index) {
    NSUInteger delta = emoji.shortcode.length - 1;
    if (index < range.location)
      start += delta;
    if (index < NSMaxRange(range))
      end += delta;
  });
  return NSMakeRange(start, end - start);
}

+ (NSRange)renderedRange:(NSRange)range inText:(NSAttributedString *)text {
  __block NSUInteger start = range.location, end = NSMaxRange(range),
                     offset = 0;
  EnumerateEmojis(text, NO, ^(CustomEmojiAttachment *emoji, NSUInteger index) {
    NSUInteger length = emoji.shortcode.length;
    NSUInteger sourceStart = index + offset;
    if (range.location > sourceStart) {
      // A nonempty selection overlapping an atom includes that whole atom.
      // Collapsed carets continue to resolve to its trailing edge.
      BOOL startsInside =
          range.length > 0 && range.location < sourceStart + length;
      start -=
          MIN(range.location - sourceStart, length) - (startsInside ? 0 : 1);
    }
    if (NSMaxRange(range) > sourceStart)
      end -= MIN(NSMaxRange(range) - sourceStart, length) - 1;
    offset += length - 1;
  });
  return NSMakeRange(start, end - start);
}

+ (void)normalizeText:(NSMutableAttributedString *)text
            selection:(NSRange *)selection
              catalog:(NSDictionary<NSString *, NSString *> *)catalog
             delegate:(id<MediaAttachmentDelegate>)delegate
            recognize:(BOOL)recognize {
  // Text replacements can inherit the old attachment's attributes. Only an
  // object-replacement character represents an emoji, never ordinary input.
  [text enumerateAttribute:NSAttachmentAttributeName
                   inRange:NSMakeRange(0, text.length)
                   options:0
                usingBlock:^(id value, NSRange range, BOOL *stop) {
                  if (![value isKindOfClass:CustomEmojiAttachment.class])
                    return;
                  for (NSUInteger i = range.location; i < NSMaxRange(range);
                       i++) {
                    if ([text.string characterAtIndex:i] != 0xFFFC) {
                      [text removeAttribute:NSAttachmentAttributeName
                                      range:NSMakeRange(i, 1)];
                      [text removeAttribute:CustomEmojiAttributeName
                                      range:NSMakeRange(i, 1)];
                    }
                  }
                }];
  NSRange sourceSelection = [self expandedRange:*selection inText:text];
  NSMutableDictionary<NSNumber *, CustomEmojiAttachment *> *existing =
      [NSMutableDictionary new];
  __block NSUInteger offset = 0;
  EnumerateEmojis(text, NO, ^(CustomEmojiAttachment *emoji, NSUInteger index) {
    existing[@(index + offset)] = emoji;
    offset += emoji.shortcode.length - 1;
  });
  NSMutableAttributedString *result = [self expandedText:text];
  static NSRegularExpression *pattern;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    pattern = [NSRegularExpression
        regularExpressionWithPattern:@"(?<![\\p{L}\\p{M}\\p{N}_]):[a-z0-9][a-"
                                     @"z0-9_-]{0,63}:(?![\\p{L}\\p{M}\\p{N}_])"
                             options:0
                               error:nil];
  });
  NSArray *matches = [pattern matchesInString:result.string
                                      options:0
                                        range:NSMakeRange(0, result.length)];
  for (NSTextCheckingResult *match in [matches reverseObjectEnumerator]) {
    NSRange range = match.range;
    NSString *shortcode = [result.string substringWithRange:range];
    NSString *uri = catalog[shortcode];
    if (uri.length == 0)
      continue;
    __block BOOL blocked = NO;
    NSDictionary *firstAttributes = [result attributesAtIndex:range.location
                                               effectiveRange:NULL];
    [result
        enumerateAttributesInRange:range
                           options:0
                        usingBlock:^(NSDictionary *attrs, NSRange run,
                                     BOOL *stop) {
                          if (![attrs isEqualToDictionary:firstAttributes])
                            blocked = YES;
                          MentionParams *mention = attrs[@"EnrichedMention"];
                          NSParagraphStyle *paragraph =
                              attrs[NSParagraphStyleAttributeName];
                          if (attrs[@"EnrichedInlineCode"] ||
                              (mention &&
                               ![mention.indicator isEqualToString:@":"]) ||
                              (!recognize && !attrs[CustomEmojiAttributeName]))
                            blocked = YES;
                          for (NSTextList *list in paragraph.textLists)
                            if ([list.markerFormat
                                    isEqualToString:@"EnrichedCodeBlock"])
                              blocked = YES;
                        }];
    if (blocked)
      continue;
    NSMutableDictionary *attrs = [[result attributesAtIndex:range.location
                                             effectiveRange:NULL] mutableCopy];
    UIFont *font = attrs[NSFontAttributeName] ?: [UIFont systemFontOfSize:17];
    CustomEmojiAttachment *attachment = existing[@(range.location)];
    if (![attachment.uri isEqualToString:uri] ||
        ![attachment.shortcode isEqualToString:shortcode])
      attachment = [[CustomEmojiAttachment alloc] initWithShortcode:shortcode
                                                                uri:uri
                                                               font:font];
    attachment.delegate = delegate;
    [attachment updateFont:font];
    [attrs removeObjectForKey:@"EnrichedMention"];
    attrs[CustomEmojiAttributeName] = shortcode;
    attrs[NSAttachmentAttributeName] = attachment;
    [result replaceCharactersInRange:range
                withAttributedString:[[NSAttributedString alloc]
                                         initWithString:@"\uFFFC"
                                             attributes:attrs]];
  }
  // Metadata belongs only to atoms; removed catalog entries become ordinary
  // text.
  [result enumerateAttribute:CustomEmojiAttributeName
                     inRange:NSMakeRange(0, result.length)
                     options:0
                  usingBlock:^(id value, NSRange range, BOOL *stop) {
                    if (value && ![result attribute:NSAttachmentAttributeName
                                            atIndex:range.location
                                     effectiveRange:NULL])
                      [result removeAttribute:CustomEmojiAttributeName
                                        range:range];
                  }];
  *selection = [self renderedRange:sourceSelection inText:result];
  if (![text isEqualToAttributedString:result])
    [text setAttributedString:result];
}
@end
