#import "CustomEmojiAttachment.h"

@implementation CustomEmojiAttachment
- (instancetype)initWithShortcode:(NSString *)shortcode
                              uri:(NSString *)uri
                             font:(UIFont *)font {
  ImageData *data = [ImageData new];
  data.uri = uri;
  data.width = data.height = font.pointSize * 1.25;
  if ((self = [super initWithImageData:data])) {
    _shortcode = [shortcode copy];
    self.accessibilityLabel = shortcode;
    [self updateFont:font];
  }
  return self;
}

- (void)updateFont:(UIFont *)font {
  CGFloat size = font.pointSize * 1.25;
  CGSize bounds = CGSizeMake(size, size);
  if (self.loadFailed) {
    NSDictionary *attributes = @{
      NSFontAttributeName : font,
      NSForegroundColorAttributeName : UIColor.labelColor
    };
    bounds = [self.shortcode sizeWithAttributes:attributes];
    UIGraphicsImageRenderer *renderer =
        [[UIGraphicsImageRenderer alloc] initWithSize:bounds];
    self.storedAnimatedImage =
        [renderer imageWithActions:^(UIGraphicsImageRendererContext *context) {
          [self.shortcode drawAtPoint:CGPointZero withAttributes:attributes];
        }];
  }
  self.bounds = (CGRect){CGPointZero, bounds};
}
@end
