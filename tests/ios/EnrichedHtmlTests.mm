#import "CustomEmojiAttachment.h"
#import "CustomEmojiHistory.h"
#import "CustomEmojiUtils.h"
#import "MentionParams.h"
#import <UIKit/UIKit.h>
#import <XCTest/XCTest.h>

// A small UITextView integration fixture exercises UIKit's real insert/delete
// delegate callbacks with the same canonical-history flow as the native editor.
@interface EmojiTestTextView : UITextView <UITextViewDelegate>
@property(nonatomic, strong) CustomEmojiHistory *history;
@property(nonatomic, strong) NSDictionary<NSString *, NSString *> *catalog;
- (void)normalizeRecognizing:(BOOL)recognize record:(BOOL)record;
@end

@implementation EmojiTestTextView
- (instancetype)initWithFrame:(CGRect)frame
                textContainer:(NSTextContainer *)container {
  if ((self = [super initWithFrame:frame textContainer:container])) {
    self.font = [UIFont systemFontOfSize:16];
    self.catalog = @{@":party:" : @"file:///nonexistent-enriched-emoji.png"};
    self.history = [CustomEmojiHistory new];
    self.history.undoManager.groupsByEvent = NO;
    __weak EmojiTestTextView *weakSelf = self;
    self.history.restore = ^(NSAttributedString *snapshot, NSRange selection) {
      EmojiTestTextView *view = weakSelf;
      [view.textStorage setAttributedString:snapshot];
      view.selectedRange = selection;
      [view normalizeRecognizing:NO record:YES];
    };
    self.delegate = self;
    [self.history observeText:self.attributedText
                    selection:self.selectedRange
                       record:NO];
  }
  return self;
}
- (NSUndoManager *)undoManager {
  return self.history ? self.history.undoManager : [super undoManager];
}
- (void)normalizeRecognizing:(BOOL)recognize record:(BOOL)record {
  NSMutableAttributedString *text = self.textStorage;
  NSRange selection = self.selectedRange;
  [CustomEmojiUtils normalizeText:text
                        selection:&selection
                          catalog:self.catalog
                         delegate:nil
                        recognize:recognize];
  self.selectedRange = selection;
  NSMutableDictionary *typing = [self.typingAttributes mutableCopy];
  [typing removeObjectForKey:CustomEmojiAttributeName];
  if ([typing[NSAttachmentAttributeName]
          isKindOfClass:CustomEmojiAttachment.class])
    [typing removeObjectForKey:NSAttachmentAttributeName];
  self.typingAttributes = typing;
  [self.history observeText:self.attributedText
                  selection:selection
                     record:record];
}
- (void)textViewDidChange:(UITextView *)textView {
  [self normalizeRecognizing:YES record:YES];
}
@end

@interface EnrichedHtmlTests : XCTestCase
@end

@implementation EnrichedHtmlTests

- (NSDictionary<NSString *, NSString *> *)catalog {
  // A missing local file exercises the normal loading path without network I/O.
  return @{@":party:" : @"file:///nonexistent-enriched-emoji.png"};
}

- (NSMutableAttributedString *)text:(NSString *)string {
  return [[NSMutableAttributedString alloc]
      initWithString:string
          attributes:@{NSFontAttributeName : [UIFont systemFontOfSize:16]}];
}

- (void)normalize:(NSMutableAttributedString *)text
        selection:(NSRange *)selection {
  [CustomEmojiUtils normalizeText:text
                        selection:selection
                          catalog:self.catalog
                         delegate:nil
                        recognize:YES];
}

- (void)testRecognitionPreservesExpandedTextAndMapsSelection {
  NSMutableAttributedString *text = [self text:@"Hello :party: world"];
  NSRange selection = NSMakeRange(text.length, 0);
  [self normalize:text selection:&selection];
  XCTAssertEqualObjects(text.string, @"Hello \ufffc world");
  XCTAssertEqual(selection.location, text.length);
  XCTAssertEqualObjects([CustomEmojiUtils expandedText:text].string,
                        @"Hello :party: world");
  XCTAssertTrue(
      [[text attribute:NSAttachmentAttributeName atIndex:6
          effectiveRange:nil] isKindOfClass:CustomEmojiAttachment.class]);
}

- (void)testUnicodeWordBoundariesAndUnknownTokensStayLiteral {
  NSArray<NSString *> *strings = @[
    @"é:party:", @":party:猫", @"_:party:", @":party:9",
    @"x\u0301:party:", @":unknown:", @":Party:"
  ];
  for (NSString *string in strings) {
    NSMutableAttributedString *text = [self text:string];
    NSRange selection = NSMakeRange(text.length, 0);
    [self normalize:text selection:&selection];
    XCTAssertEqualObjects(text.string, string, @"%@", string);
  }
}

- (void)testAdjacentTokensAndPunctuationAreRecognized {
  NSMutableAttributedString *text = [self text:@"(:party:), :party::party:!"];
  NSRange selection = NSMakeRange(text.length, 0);
  [self normalize:text selection:&selection];
  XCTAssertEqualObjects(text.string, @"(\ufffc), \ufffc\ufffc!");
  XCTAssertEqualObjects([CustomEmojiUtils expandedText:text].string,
                        @"(:party:), :party::party:!");
}

- (void)testCodeAndMentionAttributesPreventRecognition {
  MentionParams *mention = [MentionParams new];
  mention.indicator = @"@";
  NSMutableParagraphStyle *code = [NSMutableParagraphStyle new];
  code.textLists =
      @[ [[NSTextList alloc] initWithMarkerFormat:@"EnrichedCodeBlock"
                                          options:0] ];
  NSArray *attributes = @[
    @{@"EnrichedInlineCode" : @YES}, @{NSParagraphStyleAttributeName : code},
    @{@"EnrichedMention" : mention}
  ];
  for (NSDictionary *attrs in attributes) {
    NSMutableAttributedString *text = [self text:@":party:"];
    [text addAttributes:attrs range:NSMakeRange(0, text.length)];
    NSRange selection = NSMakeRange(text.length, 0);
    [self normalize:text selection:&selection];
    XCTAssertEqualObjects(text.string, @":party:", @"%@", attrs);
  }
}

- (void)testMixedFormattingIsPreserved {
  NSMutableAttributedString *text = [self text:@":party:"];
  [text addAttribute:NSFontAttributeName
               value:[UIFont boldSystemFontOfSize:16]
               range:NSMakeRange(2, 2)];
  NSAttributedString *original = [text copy];
  NSRange selection = NSMakeRange(text.length, 0);
  [self normalize:text selection:&selection];
  XCTAssertEqualObjects([CustomEmojiUtils expandedText:text], original);
}

- (void)testLinkIsPreservedAndCatalogURIRefreshKeepsSelection {
  NSMutableAttributedString *text = [self text:@"a :party: b"];
  NSURL *link = [NSURL URLWithString:@"https://example.com"];
  [text addAttribute:NSLinkAttributeName value:link range:NSMakeRange(2, 7)];
  NSRange selection = NSMakeRange(2, 7);
  [self normalize:text selection:&selection];
  XCTAssertTrue(NSEqualRanges(selection, NSMakeRange(2, 1)));
  XCTAssertEqualObjects(
      [text attribute:NSLinkAttributeName atIndex:2 effectiveRange:nil], link);
  [CustomEmojiUtils
      normalizeText:text
          selection:&selection
            catalog:@{@":party:" : @"file:///replacement-emoji.png"}
           delegate:nil
          recognize:YES];
  CustomEmojiAttachment *attachment = [text attribute:NSAttachmentAttributeName
                                              atIndex:2
                                       effectiveRange:nil];
  XCTAssertEqualObjects(attachment.uri, @"file:///replacement-emoji.png");
  XCTAssertTrue(NSEqualRanges(selection, NSMakeRange(2, 1)));
  XCTAssertEqualObjects(
      [text attribute:NSLinkAttributeName atIndex:2 effectiveRange:nil], link);
}

- (void)testCatalogRemovalExpandsTokenAndSelection {
  NSMutableAttributedString *text = [self text:@"a :party: b"];
  NSRange selection = NSMakeRange(text.length, 0);
  [self normalize:text selection:&selection];
  [CustomEmojiUtils normalizeText:text
                        selection:&selection
                          catalog:@{}
                         delegate:nil
                        recognize:YES];
  XCTAssertEqualObjects(text.string, @"a :party: b");
  XCTAssertEqual(selection.location, text.length);
  XCTAssertNil([text attribute:NSAttachmentAttributeName
                       atIndex:2
                effectiveRange:nil]);
}

- (void)testDelayedCatalogPreservesPartialShortcodeSelection {
  NSMutableAttributedString *text = [self text:@":party:"];
  NSRange selection = NSMakeRange(2, 2);
  [self normalize:text selection:&selection];
  XCTAssertEqualObjects(text.string, @"\ufffc");
  XCTAssertTrue(NSEqualRanges(selection, NSMakeRange(0, 1)));
  // A collapsed caret still resolves to the trailing edge of the atom.
  XCTAssertTrue(NSEqualRanges([CustomEmojiUtils renderedRange:NSMakeRange(2, 0)
                                                       inText:text],
                              NSMakeRange(1, 0)));
}

- (void)testSelectionRangeRoundTripAcrossMultipleTokens {
  NSMutableAttributedString *text = [self text:@"😀 :party: x :party:!"];
  NSRange selection = NSMakeRange(text.length, 0);
  [self normalize:text selection:&selection];
  NSRange rendered = NSMakeRange(3, 5);
  NSRange expanded = [CustomEmojiUtils expandedRange:rendered inText:text];
  XCTAssertTrue(NSEqualRanges(expanded, NSMakeRange(3, 17)));
  XCTAssertTrue(NSEqualRanges(
      [CustomEmojiUtils renderedRange:expanded inText:text], rendered));
}

- (void)testNormalizationIsIdempotentAndKeepsFormatting {
  NSMutableAttributedString *text = [self text:@":party:"];
  [text addAttribute:NSForegroundColorAttributeName
               value:UIColor.redColor
               range:NSMakeRange(0, text.length)];
  NSRange selection = NSMakeRange(text.length, 0);
  [self normalize:text selection:&selection];
  [self normalize:text selection:&selection];
  XCTAssertEqualObjects(text.string, @"\ufffc");
  XCTAssertEqual(selection.location, 1u);
  NSAttributedString *expanded = [CustomEmojiUtils expandedText:text];
  XCTAssertEqualObjects(expanded.string, @":party:");
  XCTAssertEqualObjects([expanded attribute:NSForegroundColorAttributeName
                                    atIndex:0
                             effectiveRange:nil],
                        UIColor.redColor);
  XCTAssertNil([expanded attribute:NSAttachmentAttributeName
                           atIndex:0
                    effectiveRange:nil]);
}

- (void)testSuppressedRecognitionLeavesPlainShortcodesUntouched {
  NSMutableAttributedString *text = [self text:@":party:"];
  NSRange selection = NSMakeRange(text.length, 0);
  [CustomEmojiUtils normalizeText:text
                        selection:&selection
                          catalog:self.catalog
                         delegate:nil
                        recognize:NO];
  XCTAssertEqualObjects(text.string, @":party:");
}

- (void)testHistoryUndoRedoSurvivesCatalogRemovalAndRestoresSelection {
  NSMutableAttributedString *text = [self text:@"a :party: b"];
  __block NSRange selection = NSMakeRange(text.length, 0);
  __block NSDictionary *catalog = self.catalog;
  [self normalize:text selection:&selection];
  CustomEmojiHistory *history = [CustomEmojiHistory new];
  history.undoManager.groupsByEvent = NO;
  __weak CustomEmojiHistory *weakHistory = history;
  history.restore = ^(NSAttributedString *snapshot, NSRange range) {
    [text setAttributedString:snapshot];
    selection = range;
    [CustomEmojiUtils normalizeText:text
                          selection:&selection
                            catalog:catalog
                           delegate:nil
                          recognize:NO];
    [weakHistory observeText:text selection:selection record:YES];
  };
  [history observeText:text selection:selection record:NO];
  [history.undoManager beginUndoGrouping];
  [text appendAttributedString:[self text:@"!"]];
  selection = NSMakeRange(text.length, 0);
  [history observeText:text selection:selection record:YES];
  [history.undoManager endUndoGrouping];
  catalog = @{};
  [CustomEmojiUtils normalizeText:text
                        selection:&selection
                          catalog:catalog
                         delegate:nil
                        recognize:YES];
  [history observeText:text selection:selection record:NO];
  [history.undoManager undo];
  XCTAssertEqualObjects(text.string, @"a :party: b");
  XCTAssertTrue(NSEqualRanges(selection, NSMakeRange(11, 0)));
  [history.undoManager redo];
  XCTAssertEqualObjects(text.string, @"a :party: b!");
  XCTAssertTrue(NSEqualRanges(selection, NSMakeRange(12, 0)));
}

- (void)testHistoryRestoresUsingCurrentCatalogURI {
  NSMutableAttributedString *text = [self text:@":party:"];
  __block NSRange selection = NSMakeRange(text.length, 0);
  __block NSDictionary *catalog = self.catalog;
  [self normalize:text selection:&selection];
  CustomEmojiHistory *history = [CustomEmojiHistory new];
  history.undoManager.groupsByEvent = NO;
  __weak CustomEmojiHistory *weakHistory = history;
  history.restore = ^(NSAttributedString *snapshot, NSRange range) {
    [text setAttributedString:snapshot];
    selection = range;
    [CustomEmojiUtils normalizeText:text
                          selection:&selection
                            catalog:catalog
                           delegate:nil
                          recognize:NO];
    [weakHistory observeText:text selection:selection record:YES];
  };
  [history observeText:text selection:selection record:NO];
  [history.undoManager beginUndoGrouping];
  [text appendAttributedString:[self text:@"!"]];
  selection = NSMakeRange(text.length, 0);
  [history observeText:text selection:selection record:YES];
  [history.undoManager endUndoGrouping];
  catalog = @{@":party:" : @"file:///replacement-emoji.png"};
  [CustomEmojiUtils normalizeText:text
                        selection:&selection
                          catalog:catalog
                         delegate:nil
                        recognize:YES];
  [history observeText:text selection:selection record:NO];
  [history.undoManager undo];
  XCTAssertEqualObjects(text.string, @"\ufffc");
  CustomEmojiAttachment *attachment = [text attribute:NSAttachmentAttributeName
                                              atIndex:0
                                       effectiveRange:nil];
  XCTAssertEqualObjects(attachment.uri, @"file:///replacement-emoji.png");
  XCTAssertTrue(NSEqualRanges(selection, NSMakeRange(1, 0)));
  [history.undoManager redo];
  XCTAssertEqualObjects(text.string, @"\ufffc!");
  XCTAssertTrue(NSEqualRanges(selection, NSMakeRange(2, 0)));
}

- (void)testHistoryDoesNotRecognizeUnconvertedShortcodes {
  NSMutableAttributedString *text = [self text:@""];
  __block NSRange selection = NSMakeRange(0, 0);
  CustomEmojiHistory *history = [CustomEmojiHistory new];
  history.undoManager.groupsByEvent = NO;
  __weak CustomEmojiHistory *weakHistory = history;
  NSDictionary *catalog = self.catalog;
  history.restore = ^(NSAttributedString *snapshot, NSRange range) {
    [text setAttributedString:snapshot];
    selection = range;
    [CustomEmojiUtils normalizeText:text
                          selection:&selection
                            catalog:catalog
                           delegate:nil
                          recognize:NO];
    [weakHistory observeText:text selection:selection record:YES];
  };
  [history observeText:text selection:selection record:NO];
  [history.undoManager beginUndoGrouping];
  [text appendAttributedString:[self text:@":party:"]];
  selection = NSMakeRange(text.length, 0);
  [history observeText:text selection:selection record:YES];
  [history.undoManager endUndoGrouping];
  [history.undoManager undo];
  XCTAssertEqualObjects(text.string, @"");
  [history.undoManager redo];
  XCTAssertEqualObjects(text.string, @":party:");
  XCTAssertTrue(NSEqualRanges(selection, NSMakeRange(7, 0)));
}

- (void)testFailedAttachmentShowsShortcodeButRemainsAtomic {
  UIFont *font = [UIFont systemFontOfSize:16];
  CustomEmojiAttachment *attachment =
      [[CustomEmojiAttachment alloc] initWithShortcode:@":party:"
                                                   uri:@"file:///missing.png"
                                                  font:font];
  attachment.loadFailed = YES;
  [attachment updateFont:font];
  XCTAssertNotNil(attachment.storedAnimatedImage);
  XCTAssertGreaterThan(attachment.bounds.size.width, font.pointSize * 1.25);
  XCTAssertEqualObjects(attachment.accessibilityLabel, @":party:");
  NSMutableAttributedString *text = [[NSAttributedString
      attributedStringWithAttachment:attachment] mutableCopy];
  XCTAssertEqual(text.length, 1u);
  XCTAssertEqualObjects([CustomEmojiUtils expandedText:text].string,
                        @":party:");
  [text deleteCharactersInRange:NSMakeRange(0, 1)];
  XCTAssertEqual(text.length, 0u);
}

- (void)testTypingBesideAttachmentDoesNotInheritEmojiIdentity {
  NSMutableAttributedString *text = [self text:@":party:"];
  NSRange selection = NSMakeRange(text.length, 0);
  [self normalize:text selection:&selection];
  NSDictionary *inherited = [text attributesAtIndex:0 effectiveRange:nil];
  [text appendAttributedString:[[NSAttributedString alloc]
                                   initWithString:@" !"
                                       attributes:inherited]];
  selection = NSMakeRange(text.length, 0);
  [self normalize:text selection:&selection];
  XCTAssertEqualObjects([CustomEmojiUtils expandedText:text].string,
                        @":party: !");
  XCTAssertEqualObjects(text.string, @"\ufffc !");
  XCTAssertNil([text attribute:NSAttachmentAttributeName
                       atIndex:1
                effectiveRange:nil]);
  XCTAssertTrue(NSEqualRanges(selection, NSMakeRange(3, 0)));
}

- (void)testUITextViewTypingAndAtomicDeletionUseCanonicalUndo {
  EmojiTestTextView *view =
      [[EmojiTestTextView alloc] initWithFrame:CGRectMake(0, 0, 320, 200)
                                 textContainer:nil];
  [view insertText:@":party:"];
  XCTAssertEqualObjects(view.text, @"\ufffc");
  XCTAssertTrue(NSEqualRanges(view.selectedRange, NSMakeRange(1, 0)));
  [view insertText:@"!"];
  XCTAssertEqualObjects(view.text, @"\ufffc!");
  XCTAssertFalse(view.undoManager.isUndoRegistrationEnabled);
  [view.undoManager undo];
  XCTAssertEqualObjects(view.text, @"\ufffc");
  XCTAssertTrue(NSEqualRanges(view.selectedRange, NSMakeRange(1, 0)));
  [view.undoManager redo];
  XCTAssertEqualObjects(view.text, @"\ufffc!");
  view.selectedRange = NSMakeRange(1, 0);
  [view.history observeSelection:view.selectedRange inText:view.attributedText];
  [view deleteBackward];
  XCTAssertEqualObjects(view.text, @"!");
  [view.undoManager undo];
  XCTAssertEqualObjects(view.text, @"\ufffc!");
  XCTAssertTrue(NSEqualRanges(view.selectedRange, NSMakeRange(1, 0)));
}

@end
