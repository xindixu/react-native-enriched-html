#pragma once
#import <UIKit/UIKit.h>

@interface InputHtmlParser : NSObject
- (instancetype _Nonnull)initWithInput:(id _Nonnull)input;
- (void)replaceWholeFromHtml:(NSString *_Nonnull)html;
- (BOOL)replaceFromHtml:(NSString *_Nonnull)html range:(NSRange)range;
- (BOOL)insertFromHtml:(NSString *_Nonnull)html location:(NSInteger)location;
- (NSString *_Nullable)initiallyProcessHtml:(NSString *_Nonnull)html;
@end
