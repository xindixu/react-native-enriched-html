#pragma once
#import "ImageAttachment.h"

@interface CustomEmojiAttachment : ImageAttachment
@property(nonatomic, copy, readonly) NSString *shortcode;
- (instancetype)initWithShortcode:(NSString *)shortcode
                              uri:(NSString *)uri
                             font:(UIFont *)font;
- (void)updateFont:(UIFont *)font;
@end
