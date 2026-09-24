#pragma once
#import "CustomEmojiAttachment.h"

FOUNDATION_EXPORT NSString *const CustomEmojiAttributeName;

@interface CustomEmojiUtils : NSObject
+ (NSMutableAttributedString *)expandedText:(NSAttributedString *)text;
+ (NSRange)expandedRange:(NSRange)range inText:(NSAttributedString *)text;
+ (NSRange)renderedRange:(NSRange)range inText:(NSAttributedString *)text;
+ (void)normalizeText:(NSMutableAttributedString *)text
            selection:(NSRange *)selection
              catalog:(NSDictionary<NSString *, NSString *> *)catalog
             delegate:(id<MediaAttachmentDelegate>)delegate
            recognize:(BOOL)recognize;
@end
