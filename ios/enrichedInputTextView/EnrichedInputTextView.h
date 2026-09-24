#pragma once
#import "CustomEmojiHistory.h"
#import <UIKit/UIKit.h>

@interface EnrichedInputTextView : UITextView
@property(nonatomic, weak) id input;
@property(nonatomic, strong) CustomEmojiHistory *emojiHistory;
@end
