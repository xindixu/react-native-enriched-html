---
sidebar_position: 3
---

# Known limitations

This page lists limitations and their platform scope. Additional differences
between iOS, Android, and Web are documented under
[Compatibility](/misc/compatibility).

Some of these are on our [Roadmap](/misc/roadmap); others are deliberate design
choices that keep the library fast and its output predictable.

## Single-level lists on native platforms

iOS and Android support single-level lists. On web, bullet, numbered, and
checkbox lists can be nested with Tab and outdented with Shift+Tab. Nested
HTML is preserved by the web editor and display component, but is not portable
to the native editor. See [Lists](/rich-text-formatting/lists).

## Fixed set of HTML tags

The library intentionally works with a fixed, curated set of standard and
custom HTML tags rather than accepting arbitrary markup. Tags outside that set
are stripped or normalized away when they enter the editor. This is a
deliberate design decision: it keeps the produced HTML portable and guarantees
that the `EnrichedTextInput` and the `EnrichedText` display render identically. See
[Supported tags](/fundamentals/html-format-and-supported-tags) for the full
list.

We may add support for more tags and related functionality over time - see the
[Roadmap](/misc/roadmap) for what is planned. If you need a specific tag that is
not supported yet, the best way to let us know is to open a
[GitHub issue](https://github.com/software-mansion/react-native-enriched-html/issues)
in our repo.

## No global blur support on mobile

On mobile, you can use `Keyboard.dismiss()` and `keyboardShouldPersistTaps` to blur
the React Native's `TextInput` on taps outside of it. This doesn't work
with `EnrichedTextInput`. This is a limitation of React Native itself, not
something specific to this library: React Native doesn't expose
`TextInputState` publicly, so we can't register our input in the React Native state.
