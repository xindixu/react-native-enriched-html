"use strict";

import { useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import './EnrichedText.css';
import { DOMParser } from '@tiptap/pm/model';
import { closeHistory } from '@tiptap/pm/history';
import { adaptWebToNativeEvent } from "./nativeMappers/adaptWebToNativeEvent.js";
import { tiptapPosToNativePos, nativePosToTiptapPos, nativeLeafText } from "./nativeMappers/positionMapping.js";
import { useEditor, EditorContent } from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import History from '@tiptap/extension-history';
import { Placeholder } from '@tiptap/extensions/placeholder';
import { useOnChangeHtml } from "./tiptapWatchers/useOnChangeHtml.js";
import { useOnChangeText } from "./tiptapWatchers/useOnChangeText.js";
import { useOnChangeState } from "./tiptapWatchers/useOnChangeState.js";
import { useOnLinkDetected } from "./tiptapWatchers/useOnLinkDetected.js";
import { prepareHtmlForTiptap, normalizeHtmlFromTiptap } from "./normalization/tiptapHtmlNormalizer.js";
import { ENRICHED_TEXT_INPUT_DEFAULT_PROPS } from "../utils/EnrichedTextInputDefaultProps.js";
import { enrichedInputStyleToCSSProperties } from "./styleConversion/enrichedInputStyleToCSSProperties.js";
import { enrichedInputThemingToCSSProperties } from "./styleConversion/enrichedThemingToCSSProperties.js";
import { buildMentionRulesCSS } from "./styleConversion/buildMentionRulesCSS.js";
import { htmlStyleToCSSVariables, mergeWithDefaultHtmlStyle } from "./styleConversion/htmlStyleToCSSVariables.js";
import { EnrichedBold } from "./formats/EnrichedBold.js";
import { EnrichedItalic } from "./formats/EnrichedItalic.js";
import { EnrichedStrike } from "./formats/EnrichedStrike.js";
import { EnrichedUnderline } from "./formats/EnrichedUnderline.js";
import { EnrichedCode } from "./formats/EnrichedCode.js";
import { EnrichedHeading } from "./formats/EnrichedHeading.js";
import { EnrichedBlockquote } from "./formats/EnrichedBlockquote.js";
import { EnrichedCodeBlock } from "./formats/EnrichedCodeBlock.js";
import { EnrichedImage } from "./formats/EnrichedImage.js";
import { EnrichedLink, setLink, removeLink } from "./formats/EnrichedLink.js";
import { EnrichedMention } from "./formats/EnrichedMention.js";
import { EnrichedListItem } from "./formats/EnrichedListItem.js";
import { EnrichedUnorderedList } from "./formats/EnrichedUnorderedList.js";
import { EnrichedOrderedList } from "./formats/EnrichedOrderedList.js";
import { EnrichedCheckboxItem } from "./formats/EnrichedCheckboxItem.js";
import { EnrichedCheckboxList } from "./formats/EnrichedCheckboxList.js";
import { EnrichedTextAlign } from "./formats/EnrichedTextAlign.js";
import { StripBoldInStyledHeadingsPlugin } from "./pmPlugins/StripBoldInStyledHeadingsPlugin.js";
import { StrictMarksPlugin } from "./pmPlugins/StrictMarksPlugin.js";
import { MergeAdjacentSameKindBlocksPlugin } from "./pmPlugins/MergeAdjacentSameKindBlocksPlugin.js";
import { OrderedListMarkerWidthPlugin } from "./pmPlugins/OrderedListMarkerWidthPlugin.js";
import { StripMarksInCodeBlockPlugin } from "./pmPlugins/StripMarksInCodeBlockPlugin.js";
import { clipboardImageFiles, handleClipboardPasteImages } from "./utils/pasteImages.js";
import { MentionPlugin, setMention, startMention, useMentionEvents } from "./pmPlugins/MentionPlugin/index.js";
import { StripMarksOnImagePlugin } from "./pmPlugins/StripMarksOnImagePlugin.js";
import { ShortcutPlugin } from "./pmPlugins/ShortcutPlugin.js";
import { TextShortcutsPlugin } from "./pmPlugins/TextShortcutsPlugin.js";
import { returnKeyTypeToEnterKeyHint } from "./nativeMappers/returnKeyTypeToEnterKeyHint.js";
import { ENRICHED_TEXT_INPUT_CLASSNAME } from "./constants/classNames.js";
import { AutolinkPlugin } from "./pmPlugins/AutolinkPlugin/index.js";
import { useStableRef } from "./utils/useStableRef.js";
import { checkMentionAttributes, sanitizeMentionAttributes } from "./sanitization/htmlSanitizer.js";
import { assertBrowserEnvironment } from "./utils/assertBrowserEnvironment.js";
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
function runFocused(editor, apply) {
  apply(editor.chain().focus()).run();
}
export const EnrichedTextInput = ({
  ref,
  defaultValue,
  autoFocus = false,
  editable = ENRICHED_TEXT_INPUT_DEFAULT_PROPS.editable,
  placeholder = '',
  placeholderTextColor,
  cursorColor,
  selectionColor,
  autoCapitalize = ENRICHED_TEXT_INPUT_DEFAULT_PROPS.autoCapitalize,
  scrollEnabled = ENRICHED_TEXT_INPUT_DEFAULT_PROPS.scrollEnabled,
  mentionIndicators = ENRICHED_TEXT_INPUT_DEFAULT_PROPS.mentionIndicators.slice(),
  onFocus,
  style,
  onBlur,
  onChangeSelection,
  onKeyPress,
  onChangeText,
  onChangeHtml,
  onChangeState,
  onLinkDetected,
  onSubmitEditing,
  returnKeyType,
  submitBehavior,
  onPasteImages,
  onPaste,
  onMentionDetected,
  onStartMention,
  onChangeMention,
  onEndMention,
  linkRegex,
  htmlStyle,
  useHtmlNormalizer = ENRICHED_TEXT_INPUT_DEFAULT_PROPS.useHtmlNormalizer,
  sanitizationConfig,
  textShortcuts = ENRICHED_TEXT_INPUT_DEFAULT_PROPS.textShortcuts
}) => {
  assertBrowserEnvironment('EnrichedTextInput');
  const tiptapContent = defaultValue != null ? prepareHtmlForTiptap(defaultValue, useHtmlNormalizer, sanitizationConfig) : defaultValue;
  const resolvedHtmlStyle = useMemo(() => mergeWithDefaultHtmlStyle(htmlStyle), [htmlStyle]);
  const mentionCallbacks = useMemo(() => ({
    onStartMention,
    onChangeMention,
    onEndMention,
    onMentionDetected
  }), [onStartMention, onChangeMention, onEndMention, onMentionDetected]);
  const htmlStyleRef = useStableRef(resolvedHtmlStyle);
  const onPasteImagesRef = useStableRef(onPasteImages);
  const onPasteRef = useStableRef(onPaste);
  const nextPasteId = useRef(0);
  const pendingPaste = useRef(null);
  const processPaste = onPaste !== undefined;
  useEffect(() => {
    pendingPaste.current = null;
  }, [editable, processPaste]);
  const mentionIndicatorsRef = useStableRef(mentionIndicators);
  const submitBehaviorRef = useStableRef(submitBehavior);
  const onSubmitEditingRef = useStableRef(onSubmitEditing);
  const onKeyPressRef = useStableRef(onKeyPress);
  const useHtmlNormalizerRef = useStableRef(useHtmlNormalizer);
  const sanitizationConfigRef = useStableRef(sanitizationConfig);
  const mentionCallbacksRef = useStableRef(mentionCallbacks);
  const textShortcutsRef = useStableRef(textShortcuts);
  const editorInstanceRef = useRef(null);
  const handleKeyDown = (doc, event) => {
    onKeyPressRef.current?.(adaptWebToNativeEvent(event, {
      key: event.key
    }));
    if (event.key !== 'Enter') {
      return false;
    }
    const sb = submitBehaviorRef.current;
    if (sb === 'submit' || sb === 'blurAndSubmit') {
      event.preventDefault();
      const text = nativeLeafText(doc, 0, doc.content.size);
      onSubmitEditingRef.current?.(adaptWebToNativeEvent(event, {
        text
      }));
      if (sb === 'blurAndSubmit') {
        editorInstanceRef.current?.commands.blur();
      }
      return true;
    }
    return false;
  };
  const linkEmitterRef = useRef({
    linkRegex,
    onLinkDetected,
    lastEmitted: null
  });
  useEffect(() => {
    linkEmitterRef.current.linkRegex = linkRegex;
    linkEmitterRef.current.onLinkDetected = onLinkDetected;
  }, [linkRegex, onLinkDetected]);
  const extensions = useMemo(() => [Document, Paragraph, Text, History, EnrichedBold, EnrichedItalic, EnrichedUnderline, EnrichedStrike, EnrichedCode, EnrichedLink.configure({
    getLinkRegex: () => linkEmitterRef.current.linkRegex
  }), EnrichedImage, EnrichedMention, EnrichedHeading, EnrichedBlockquote, EnrichedCodeBlock, EnrichedListItem, EnrichedCheckboxItem, EnrichedUnorderedList, EnrichedOrderedList, EnrichedCheckboxList, EnrichedTextAlign, StripMarksInCodeBlockPlugin, StripMarksOnImagePlugin, StripBoldInStyledHeadingsPlugin.configure({
    getHtmlStyle: () => htmlStyleRef.current
  }), MergeAdjacentSameKindBlocksPlugin, OrderedListMarkerWidthPlugin, StrictMarksPlugin, MentionPlugin.configure({
    getIndicators: () => mentionIndicatorsRef.current
  }), ShortcutPlugin.configure({
    getHtmlStyle: () => htmlStyleRef.current
  }), TextShortcutsPlugin.configure({
    getTextShortcuts: () => textShortcutsRef.current,
    getHtmlStyle: () => htmlStyleRef.current
  }), AutolinkPlugin.configure({
    getLinkEmitter: () => linkEmitterRef.current
  }), Placeholder.configure({
    placeholder,
    showOnlyWhenEditable: true
  })], [placeholder, htmlStyleRef, mentionIndicatorsRef, textShortcutsRef]);
  const editor = useEditor({
    extensions,
    editable,
    autofocus: autoFocus,
    onCreate: ({
      editor: _editor
    }) => {
      // Setting initial content in this way ensures all custom plugins are run and applied
      _editor.commands.setContent(tiptapContent ?? '');
    },
    onFocus: ({
      event
    }) => {
      onFocus?.(adaptWebToNativeEvent(event, {
        target: -1
      }));
    },
    onTransaction: ({
      transaction
    }) => {
      if (transaction.docChanged || transaction.selectionSet || transaction.storedMarksSet) {
        pendingPaste.current = null;
      }
    },
    onDestroy: () => {
      pendingPaste.current = null;
    },
    onBlur: ({
      event
    }) => {
      pendingPaste.current = null;
      onBlur?.(adaptWebToNativeEvent(event, {
        target: -1
      }));
    },
    onSelectionUpdate: ({
      editor: _editor
    }) => {
      const {
        state
      } = _editor;
      const {
        from,
        to
      } = state.selection;
      const start = tiptapPosToNativePos(state.doc, from);
      const end = tiptapPosToNativePos(state.doc, to);
      const text = nativeLeafText(state.doc, from, to);
      onChangeSelection?.(adaptWebToNativeEvent(null, {
        start,
        end,
        text
      }));
    },
    editorProps: {
      handleKeyDown: (view, event) => handleKeyDown(view.state.doc, event),
      handlePaste: (view, event, slice) => {
        pendingPaste.current = null;
        if (handleClipboardPasteImages(event, () => editorInstanceRef.current, () => onPasteImagesRef.current)) return true;
        const callback = onPasteRef.current;
        if (!callback || !event.clipboardData) return false;
        // Leave image-containing pastes to the existing editor handlers.
        let containsImage = clipboardImageFiles(event.clipboardData).length > 0;
        slice.content.descendants(node => {
          if (node.type.name === 'image') containsImage = true;
          return !containsImage;
        });
        if (containsImage) return false;
        event.preventDefault();
        const requestId = String(++nextPasteId.current);
        const {
          from,
          to
        } = view.state.selection;
        pendingPaste.current = {
          requestId,
          from,
          to
        };
        callback(adaptWebToNativeEvent(event, {
          requestId,
          html: event.clipboardData.getData('text/html'),
          text: event.clipboardData.getData('text/plain')
        }));
        return true;
      },
      attributes: {
        autoCapitalize,
        enterkeyhint: returnKeyTypeToEnterKeyHint(returnKeyType)
      },
      transformPastedHTML: html => {
        return prepareHtmlForTiptap(html, useHtmlNormalizerRef.current, sanitizationConfigRef.current);
      }
    }
  }, [tiptapContent, extensions]);
  useEffect(() => {
    editorInstanceRef.current = editor ?? null;
  }, [editor]);
  useEffect(() => {
    if (!editor) return;
    let dom;
    try {
      dom = editor.view.dom;
    } catch {
      return;
    }
    dom.setAttribute('enterkeyhint', returnKeyTypeToEnterKeyHint(returnKeyType));
  }, [editor, returnKeyType]);
  useEffect(() => {
    // When React reveals a hidden subtree it re-mounts the subtree's effects
    // against the values of its last render, and `useEditor` destroys that
    // editor while the subtree is hidden. A destroyed editor is not null, and
    // its `commands` getter throws, so `isDestroyed` is the check that holds.
    if (!editor || editor.isDestroyed) return;
    editor.commands.normalizeBoldInStyledHeadings();
  }, [editor, resolvedHtmlStyle]);
  const getMentionCallbacks = useCallback(() => mentionCallbacksRef.current, [mentionCallbacksRef]);
  useMentionEvents(editor, getMentionCallbacks);
  useOnChangeHtml(editor, () => sanitizationConfigRef.current, onChangeHtml);
  useOnChangeText(editor, onChangeText);
  useOnChangeState(editor, resolvedHtmlStyle, onChangeState);
  useOnLinkDetected(editor, linkEmitterRef);
  useImperativeHandle(ref, () => ({
    focus: () => editor.commands.focus(),
    blur: () => editor.commands.blur(),
    setValue: value => editor.commands.setContent(prepareHtmlForTiptap(value, useHtmlNormalizerRef.current, sanitizationConfigRef.current)),
    setSelection: (start, end) => {
      const doc = editor.state.doc;
      runFocused(editor, c => c.setTextSelection({
        from: nativePosToTiptapPos(doc, start),
        to: nativePosToTiptapPos(doc, end)
      }));
    },
    completePaste: async (requestId, html) => {
      const pending = pendingPaste.current;
      if (!pending || pending.requestId !== requestId) return false;
      pendingPaste.current = null;
      if (!html || editor.isDestroyed || !editor.isEditable || !editor.isFocused || !onPasteRef.current) return false;
      const content = prepareHtmlForTiptap(html, useHtmlNormalizerRef.current, sanitizationConfigRef.current);
      const container = document.createElement('div');
      container.innerHTML = content;
      const slice = DOMParser.fromSchema(editor.schema).parseSlice(container, {
        preserveWhitespace: true
      });
      if (!slice.size) return false;
      const transaction = closeHistory(editor.state.tr).replaceSelection(slice);
      editor.view.dispatch(transaction.scrollIntoView());
      editor.view.dispatch(closeHistory(editor.state.tr));
      return true;
    },
    getHTML: () => Promise.resolve(normalizeHtmlFromTiptap(editor.getHTML(), () => sanitizationConfigRef.current)),
    toggleBold: () => runFocused(editor, c => c.toggleBold()),
    toggleItalic: () => runFocused(editor, c => c.toggleItalic()),
    toggleUnderline: () => runFocused(editor, c => c.toggleUnderline()),
    toggleStrikeThrough: () => runFocused(editor, c => c.toggleStrike()),
    toggleInlineCode: () => runFocused(editor, c => c.toggleCode()),
    toggleH1: () => runFocused(editor, c => c.toggleHeading({
      level: 1
    })),
    toggleH2: () => runFocused(editor, c => c.toggleHeading({
      level: 2
    })),
    toggleH3: () => runFocused(editor, c => c.toggleHeading({
      level: 3
    })),
    toggleH4: () => runFocused(editor, c => c.toggleHeading({
      level: 4
    })),
    toggleH5: () => runFocused(editor, c => c.toggleHeading({
      level: 5
    })),
    toggleH6: () => runFocused(editor, c => c.toggleHeading({
      level: 6
    })),
    toggleCodeBlock: () => runFocused(editor, c => c.toggleCodeBlock()),
    toggleBlockQuote: () => runFocused(editor, c => c.toggleBlockquote()),
    toggleOrderedList: () => runFocused(editor, c => c.toggleOrderedList()),
    toggleUnorderedList: () => runFocused(editor, c => c.toggleUnorderedList()),
    toggleCheckboxList: checked => runFocused(editor, c => c.toggleCheckboxList(checked)),
    setLink: (start, end, text, url) => setLink(editor, start, end, text, url),
    removeLink: (start, end) => removeLink(editor, start, end),
    startMention: indicator => {
      startMention(editor, indicator, mentionIndicatorsRef.current);
    },
    setMention: (indicator, text, attributes) => {
      checkMentionAttributes(attributes);
      setMention(editor, indicator, text, sanitizeMentionAttributes(attributes));
    },
    setImage: (src, width, height) => runFocused(editor, c => c.setImage({
      src,
      width,
      height
    })),
    measure: () => {},
    measureInWindow: () => {},
    measureLayout: () => {},
    setNativeProps: () => {},
    setTextAlignment: alignment => {
      if (alignment === 'auto') {
        runFocused(editor, c => c.unsetTextAlign());
      } else {
        runFocused(editor, c => c.setTextAlign(alignment));
      }
    }
  }), [editor, mentionIndicatorsRef, useHtmlNormalizerRef, sanitizationConfigRef, onPasteRef]);
  const editorStyle = useMemo(() => enrichedInputStyleToCSSProperties(style ?? {}, {
    scrollEnabled
  }), [scrollEnabled, style]);
  const cssVars = useMemo(() => htmlStyleToCSSVariables(resolvedHtmlStyle), [resolvedHtmlStyle]);
  const themingStyle = useMemo(() => enrichedInputThemingToCSSProperties({
    cursorColor,
    placeholderTextColor,
    selectionColor
  }), [cursorColor, placeholderTextColor, selectionColor]);
  const mentionRulesCSS = useMemo(() => buildMentionRulesCSS(resolvedHtmlStyle), [resolvedHtmlStyle]);
  const finalStyle = useMemo(() => ({
    ...editorStyle,
    ...cssVars,
    ...themingStyle
  }), [editorStyle, cssVars, themingStyle]);
  return /*#__PURE__*/_jsxs(_Fragment, {
    children: [mentionRulesCSS ? /*#__PURE__*/_jsx("style", {
      children: mentionRulesCSS
    }) : null, /*#__PURE__*/_jsx(EditorContent, {
      editor: editor,
      className: ENRICHED_TEXT_INPUT_CLASSNAME,
      style: finalStyle,
      "data-placeholder": placeholder
    })]
  });
};
//# sourceMappingURL=EnrichedTextInput.js.map