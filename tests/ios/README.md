# iOS custom emoji unit tests

This standalone XCTest target compiles the library's custom emoji text utilities
and attachment classes directly. A minimal test host app initializes UIKit for
real UITextView interaction and image rendering. It needs Xcode and an installed iOS simulator;
it does not need the React Native example app, CocoaPods, or network access.

List installed simulators with `xcrun simctl list devices available`, then run:

```sh
xcodebuild test \
  -project tests/ios/EnrichedHtmlTests.xcodeproj \
  -scheme EnrichedHtmlTests \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro Max,OS=26.5' \
  -parallel-testing-enabled NO \
  -derivedDataPath /tmp/enriched-html-ios-tests
```

Replace the destination with an installed simulator. Tests cover shortcode
boundaries, formatting and link preservation, excluded contexts, catalog updates,
and selection conversion between rendered UTF-16 attachment positions and
expanded shortcode positions. History tests exercise undo/redo across catalog
changes, and attachment tests cover failure fallback and inherited typing
attributes. A UITextView integration fixture checks real insert/delete delegate
callbacks and undo/redo using the custom history manager.
