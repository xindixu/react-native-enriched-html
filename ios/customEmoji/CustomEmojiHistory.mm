#import "CustomEmojiHistory.h"
#import "CustomEmojiUtils.h"

@implementation CustomEmojiHistory {
  NSAttributedString *_current;
  NSRange _selection;
}
- (instancetype)init {
  if ((self = [super init])) {
    _undoManager = [NSUndoManager new];
    // UITextView must not register range-based operations alongside snapshots.
    [_undoManager disableUndoRegistration];
  }
  return self;
}
- (void)registerSnapshot:(NSAttributedString *)snapshot
               selection:(NSRange)selection {
  NSUInteger disabled = 0;
  while (!_undoManager.isUndoRegistrationEnabled) {
    [_undoManager enableUndoRegistration];
    disabled++;
  }
  BOOL ownGroup = _undoManager.groupingLevel == 0;
  if (ownGroup)
    [_undoManager beginUndoGrouping];
  [_undoManager registerUndoWithTarget:self
                               handler:^(CustomEmojiHistory *target) {
                                 [target registerSnapshot:target->_current
                                                selection:target->_selection];
                                 target->_restoring = YES;
                                 @try {
                                   if (target.restore)
                                     target.restore(snapshot, selection);
                                 } @finally {
                                   target->_restoring = NO;
                                 }
                               }];
  if (ownGroup)
    [_undoManager endUndoGrouping];
  while (disabled-- > 0)
    [_undoManager disableUndoRegistration];
}
- (void)observeText:(NSAttributedString *)text
          selection:(NSRange)selection
             record:(BOOL)record {
  NSAttributedString *source = [CustomEmojiUtils expandedText:text];
  if (record && !_restoring && _current &&
      ![_current isEqualToAttributedString:source])
    [self registerSnapshot:_current selection:_selection];
  _current = source;
  _selection = [CustomEmojiUtils expandedRange:selection inText:text];
}
- (void)observeSelection:(NSRange)selection inText:(NSAttributedString *)text {
  if ([_current isEqualToAttributedString:[CustomEmojiUtils expandedText:text]])
    _selection = [CustomEmojiUtils expandedRange:selection inText:text];
}
- (void)reset {
  [_undoManager removeAllActions];
  _current = nil;
}
@end
