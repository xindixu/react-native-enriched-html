#pragma once
#import <UIKit/UIKit.h>

// Canonical snapshots keep UIKit's undo ranges independent of catalog changes.
@interface CustomEmojiHistory : NSObject
@property(nonatomic, strong, readonly) NSUndoManager *undoManager;
@property(nonatomic, copy) void (^restore)(NSAttributedString *, NSRange);
@property(nonatomic, readonly) BOOL restoring;
- (void)observeText:(NSAttributedString *)text
          selection:(NSRange)selection
             record:(BOOL)record;
- (void)observeSelection:(NSRange)selection inText:(NSAttributedString *)text;
- (void)reset;
@end
