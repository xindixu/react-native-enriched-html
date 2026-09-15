import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type CSSProperties,
} from 'react';
import './EnrichedText.css';
import { DOMParser, type Node } from '@tiptap/pm/model';
import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';
import type {
  EnrichedTextInputInstance,
  EnrichedTextInputProps,
} from '../types';
import { adaptWebToNativeEvent } from './nativeMappers/adaptWebToNativeEvent';
import {
  tiptapPosToNativePos,
  nativePosToTiptapPos,
  nativeLeafText,
} from './nativeMappers/positionMapping';
import {
  useEditor,
  EditorContent,
  type ChainedCommands,
  Editor,
} from '@tiptap/react';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import History from '@tiptap/extension-history';
import { Placeholder } from '@tiptap/extensions/placeholder';
import { useOnChangeHtml } from './tiptapWatchers/useOnChangeHtml';
import { useOnChangeText } from './tiptapWatchers/useOnChangeText';
import { useOnChangeState } from './tiptapWatchers/useOnChangeState';
import { useOnLinkDetected } from './tiptapWatchers/useOnLinkDetected';
import type { LinkEmitterState } from './tiptapWatchers/emitLinkDetected';
import {
  prepareHtmlForTiptap,
  normalizeHtmlFromTiptap,
} from './normalization/tiptapHtmlNormalizer';
import { ENRICHED_TEXT_INPUT_DEFAULT_PROPS } from '../utils/EnrichedTextInputDefaultProps';
import { enrichedInputStyleToCSSProperties } from './styleConversion/enrichedInputStyleToCSSProperties';
import { enrichedInputThemingToCSSProperties } from './styleConversion/enrichedThemingToCSSProperties';
import { buildMentionRulesCSS } from './styleConversion/buildMentionRulesCSS';
import {
  htmlStyleToCSSVariables,
  mergeWithDefaultHtmlStyle,
} from './styleConversion/htmlStyleToCSSVariables';
import { EnrichedBold } from './formats/EnrichedBold';
import { EnrichedItalic } from './formats/EnrichedItalic';
import { EnrichedStrike } from './formats/EnrichedStrike';
import { EnrichedUnderline } from './formats/EnrichedUnderline';
import { EnrichedCode } from './formats/EnrichedCode';
import { EnrichedHeading } from './formats/EnrichedHeading';
import { EnrichedBlockquote } from './formats/EnrichedBlockquote';
import { EnrichedCodeBlock } from './formats/EnrichedCodeBlock';
import { EnrichedImage } from './formats/EnrichedImage';
import { EnrichedLink, setLink, removeLink } from './formats/EnrichedLink';
import { EnrichedMention } from './formats/EnrichedMention';
import { EnrichedListItem } from './formats/EnrichedListItem';
import { EnrichedUnorderedList } from './formats/EnrichedUnorderedList';
import { EnrichedOrderedList } from './formats/EnrichedOrderedList';
import { EnrichedCheckboxItem } from './formats/EnrichedCheckboxItem';
import { EnrichedCheckboxList } from './formats/EnrichedCheckboxList';
import { EnrichedTextAlign } from './formats/EnrichedTextAlign';
import { StripBoldInStyledHeadingsPlugin } from './pmPlugins/StripBoldInStyledHeadingsPlugin';
import { StrictMarksPlugin } from './pmPlugins/StrictMarksPlugin';
import { MergeAdjacentSameKindBlocksPlugin } from './pmPlugins/MergeAdjacentSameKindBlocksPlugin';
import { OrderedListMarkerWidthPlugin } from './pmPlugins/OrderedListMarkerWidthPlugin';
import { StripMarksInCodeBlockPlugin } from './pmPlugins/StripMarksInCodeBlockPlugin';
import {
  clipboardImageFiles,
  handleClipboardPasteImages,
} from './utils/pasteImages';
import {
  MentionPlugin,
  setMention,
  startMention,
  useMentionEvents,
} from './pmPlugins/MentionPlugin';
import { StripMarksOnImagePlugin } from './pmPlugins/StripMarksOnImagePlugin';
import { ShortcutPlugin } from './pmPlugins/ShortcutPlugin';
import { TextShortcutsPlugin } from './pmPlugins/TextShortcutsPlugin';
import { returnKeyTypeToEnterKeyHint } from './nativeMappers/returnKeyTypeToEnterKeyHint';
import { ENRICHED_TEXT_INPUT_CLASSNAME } from './constants/classNames';
import { AutolinkPlugin } from './pmPlugins/AutolinkPlugin';
import { useStableRef } from './utils/useStableRef';
import {
  checkMentionAttributes,
  sanitizeMentionAttributes,
} from './sanitization/htmlSanitizer';
import { assertBrowserEnvironment } from './utils/assertBrowserEnvironment';

function runFocused(
  editor: Editor,
  apply: (chain: ChainedCommands) => ChainedCommands
) {
  apply(editor.chain().focus()).run();
}

function plainTextLength(doc: Node): number {
  let length = 0;
  let firstBlock = true;
  doc.descendants((node) => {
    if (node.isBlock && (node.isLeaf || node.isTextblock)) {
      if (!firstBlock) length++;
      firstBlock = false;
    }
    length += node.isText ? node.text!.length : node.isLeaf ? 1 : 0;
  });
  return length;
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
  maxPlainTextLength = -1,
  onMaxLengthExceeded,
  onMentionDetected,
  onStartMention,
  onChangeMention,
  onEndMention,
  linkRegex,
  htmlStyle,
  useHtmlNormalizer = ENRICHED_TEXT_INPUT_DEFAULT_PROPS.useHtmlNormalizer,
  sanitizationConfig,
  textShortcuts = ENRICHED_TEXT_INPUT_DEFAULT_PROPS.textShortcuts,
}: EnrichedTextInputProps) => {
  assertBrowserEnvironment('EnrichedTextInput');

  const tiptapContent =
    defaultValue != null
      ? prepareHtmlForTiptap(
          defaultValue,
          useHtmlNormalizer,
          sanitizationConfig
        )
      : defaultValue;

  const resolvedHtmlStyle = useMemo(
    () => mergeWithDefaultHtmlStyle(htmlStyle),
    [htmlStyle]
  );
  const mentionCallbacks = useMemo(
    () => ({
      onStartMention,
      onChangeMention,
      onEndMention,
      onMentionDetected,
    }),
    [onStartMention, onChangeMention, onEndMention, onMentionDetected]
  );

  const htmlStyleRef = useStableRef(resolvedHtmlStyle);
  const onPasteImagesRef = useStableRef(onPasteImages);
  const onPasteRef = useStableRef(onPaste);
  const lengthLimit = useStableRef({ maxPlainTextLength, onMaxLengthExceeded });
  const acceptsDocument = useCallback(
    (doc: Node, previous: Node): boolean => {
      const { maxPlainTextLength: maxLength, onMaxLengthExceeded: exceeded } =
        lengthLimit.current;
      if (maxLength < 0) return true;
      const length = plainTextLength(doc);
      if (length <= maxLength || length <= plainTextLength(previous))
        return true;
      exceeded?.(adaptWebToNativeEvent(null, { maxLength }));
      return false;
    },
    [lengthLimit]
  );
  const nextPasteId = useRef(0);
  const pendingPaste = useRef<{
    requestId: string;
    from: number;
    to: number;
  } | null>(null);
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

  const editorInstanceRef = useRef<Editor | null>(null);

  const handleKeyDown = (doc: Node, event: KeyboardEvent): boolean => {
    onKeyPressRef.current?.(adaptWebToNativeEvent(event, { key: event.key }));
    if (event.key !== 'Enter') {
      return false;
    }

    const sb = submitBehaviorRef.current;
    if (sb === 'submit' || sb === 'blurAndSubmit') {
      event.preventDefault();
      const text = nativeLeafText(doc, 0, doc.content.size);
      onSubmitEditingRef.current?.(adaptWebToNativeEvent(event, { text }));
      if (sb === 'blurAndSubmit') {
        editorInstanceRef.current?.commands.blur();
      }
      return true;
    }

    return false;
  };

  const linkEmitterRef = useRef<LinkEmitterState>({
    linkRegex,
    onLinkDetected,
    lastEmitted: null,
  });
  useEffect(() => {
    linkEmitterRef.current.linkRegex = linkRegex;
    linkEmitterRef.current.onLinkDetected = onLinkDetected;
  }, [linkRegex, onLinkDetected]);

  const extensions = useMemo(
    () => [
      Extension.create({
        name: 'plainTextLengthLimit',
        addProseMirrorPlugins: () => [
          new Plugin({
            filterTransaction: (tr, state) =>
              !tr.docChanged ||
              tr.getMeta('lengthLimitHydration') ||
              acceptsDocument(tr.doc, state.doc),
          }),
        ],
      }),
      Document,
      Paragraph,
      Text,
      History,
      EnrichedBold,
      EnrichedItalic,
      EnrichedUnderline,
      EnrichedStrike,
      EnrichedCode,
      EnrichedLink.configure({
        getLinkRegex: () => linkEmitterRef.current.linkRegex,
      }),
      EnrichedImage,
      EnrichedMention,
      EnrichedHeading,
      EnrichedBlockquote,
      EnrichedCodeBlock,
      EnrichedListItem,
      EnrichedCheckboxItem,
      EnrichedUnorderedList,
      EnrichedOrderedList,
      EnrichedCheckboxList,
      EnrichedTextAlign,
      StripMarksInCodeBlockPlugin,
      StripMarksOnImagePlugin,
      StripBoldInStyledHeadingsPlugin.configure({
        getHtmlStyle: () => htmlStyleRef.current,
      }),
      MergeAdjacentSameKindBlocksPlugin,
      OrderedListMarkerWidthPlugin,
      StrictMarksPlugin,
      MentionPlugin.configure({
        getIndicators: () => mentionIndicatorsRef.current,
      }),
      ShortcutPlugin.configure({
        getHtmlStyle: () => htmlStyleRef.current,
      }),
      TextShortcutsPlugin.configure({
        getTextShortcuts: () => textShortcutsRef.current,
        getHtmlStyle: () => htmlStyleRef.current,
      }),
      AutolinkPlugin.configure({
        getLinkEmitter: () => linkEmitterRef.current,
      }),
      Placeholder.configure({
        placeholder,
        showOnlyWhenEditable: true,
      }),
    ],
    [
      placeholder,
      htmlStyleRef,
      mentionIndicatorsRef,
      textShortcutsRef,
      acceptsDocument,
    ]
  );

  const editor = useEditor(
    {
      extensions,
      editable,
      autofocus: autoFocus,
      onCreate: ({ editor: _editor }) => {
        // Setting initial content in this way ensures all custom plugins are run and applied
        _editor
          .chain()
          .setMeta('lengthLimitHydration', true)
          .setContent(tiptapContent ?? '')
          .run();
      },
      onFocus: ({ event }) => {
        onFocus?.(adaptWebToNativeEvent(event, { target: -1 }));
      },
      onTransaction: ({ transaction }) => {
        if (
          transaction.docChanged ||
          transaction.selectionSet ||
          transaction.storedMarksSet
        ) {
          pendingPaste.current = null;
        }
      },
      onDestroy: () => {
        pendingPaste.current = null;
      },
      onBlur: ({ event }) => {
        pendingPaste.current = null;
        onBlur?.(adaptWebToNativeEvent(event, { target: -1 }));
      },
      onSelectionUpdate: ({ editor: _editor }) => {
        const { state } = _editor;
        const { from, to } = state.selection;

        const start = tiptapPosToNativePos(state.doc, from);
        const end = tiptapPosToNativePos(state.doc, to);
        const text = nativeLeafText(state.doc, from, to);
        onChangeSelection?.(adaptWebToNativeEvent(null, { start, end, text }));
      },
      editorProps: {
        handleKeyDown: (view, event) => handleKeyDown(view.state.doc, event),
        handleDOMEvents: {
          beforeinput: (view, event) => {
            if (
              lengthLimit.current.maxPlainTextLength < 0 ||
              !event.cancelable ||
              !event.inputType.startsWith('insert') ||
              event.data == null
            )
              return false;
            const target = event.getTargetRanges?.()[0];
            const from = target
              ? view.posAtDOM(target.startContainer, target.startOffset)
              : view.state.selection.from;
            const to = target
              ? view.posAtDOM(target.endContainer, target.endOffset)
              : view.state.selection.to;
            const proposed = view.state.tr.insertText(event.data, from, to);
            if (acceptsDocument(proposed.doc, view.state.doc)) return false;
            event.preventDefault();
            return true;
          },
        },
        handlePaste: (view, event, slice) => {
          pendingPaste.current = null;
          if (
            handleClipboardPasteImages(
              event,
              () => editorInstanceRef.current,
              () => onPasteImagesRef.current
            )
          )
            return true;
          const callback = onPasteRef.current;
          if (!callback || !event.clipboardData) return false;
          // Leave image-containing pastes to the existing editor handlers.
          let containsImage =
            clipboardImageFiles(event.clipboardData).length > 0;
          slice.content.descendants((node) => {
            if (node.type.name === 'image') containsImage = true;
            return !containsImage;
          });
          if (containsImage) return false;
          event.preventDefault();
          const requestId = String(++nextPasteId.current);
          const { from, to } = view.state.selection;
          pendingPaste.current = { requestId, from, to };
          callback(
            adaptWebToNativeEvent(event, {
              requestId,
              html: event.clipboardData.getData('text/html'),
              text: event.clipboardData.getData('text/plain'),
            })
          );
          return true;
        },
        attributes: {
          autoCapitalize,
          enterkeyhint: returnKeyTypeToEnterKeyHint(returnKeyType),
        },
        transformPastedHTML: (html) => {
          return prepareHtmlForTiptap(
            html,
            useHtmlNormalizerRef.current,
            sanitizationConfigRef.current
          );
        },
      },
    },
    [tiptapContent, extensions]
  );

  useEffect(() => {
    editorInstanceRef.current = editor ?? null;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    let dom: HTMLElement;
    try {
      dom = editor.view.dom;
    } catch {
      return;
    }
    dom.setAttribute(
      'enterkeyhint',
      returnKeyTypeToEnterKeyHint(returnKeyType)
    );
  }, [editor, returnKeyType]);

  useEffect(() => {
    // When React reveals a hidden subtree it re-mounts the subtree's effects
    // against the values of its last render, and `useEditor` destroys that
    // editor while the subtree is hidden. A destroyed editor is not null, and
    // its `commands` getter throws, so `isDestroyed` is the check that holds.
    if (!editor || editor.isDestroyed) return;
    editor.commands.normalizeBoldInStyledHeadings();
  }, [editor, resolvedHtmlStyle]);

  const getMentionCallbacks = useCallback(
    () => mentionCallbacksRef.current,
    [mentionCallbacksRef]
  );

  useMentionEvents(editor, getMentionCallbacks);
  useOnChangeHtml(editor, () => sanitizationConfigRef.current, onChangeHtml);
  useOnChangeText(editor, onChangeText);
  useOnChangeState(editor, resolvedHtmlStyle, onChangeState);
  useOnLinkDetected(editor, linkEmitterRef);

  useImperativeHandle(
    ref,
    (): EnrichedTextInputInstance => ({
      focus: () => editor.commands.focus(),
      blur: () => editor.commands.blur(),
      setValue: (value: string) =>
        editor
          .chain()
          .setMeta('lengthLimitHydration', true)
          .setContent(
            prepareHtmlForTiptap(
              value,
              useHtmlNormalizerRef.current,
              sanitizationConfigRef.current
            )
          )
          .run(),
      setSelection: (start, end) => {
        const doc = editor.state.doc;
        runFocused(editor, (c) =>
          c.setTextSelection({
            from: nativePosToTiptapPos(doc, start),
            to: nativePosToTiptapPos(doc, end),
          })
        );
      },
      completePaste: async (requestId, html) => {
        const pending = pendingPaste.current;
        if (!pending || pending.requestId !== requestId) return false;
        pendingPaste.current = null;
        if (
          !html ||
          editor.isDestroyed ||
          !editor.isEditable ||
          !editor.isFocused ||
          !onPasteRef.current
        )
          return false;
        const content = prepareHtmlForTiptap(
          html,
          useHtmlNormalizerRef.current,
          sanitizationConfigRef.current
        );
        const container = document.createElement('div');
        container.innerHTML = content;
        const slice = DOMParser.fromSchema(editor.schema).parseSlice(
          container,
          { preserveWhitespace: true }
        );
        if (!slice.size) return false;
        const transaction = closeHistory(editor.state.tr).replaceSelection(
          slice
        );
        if (!acceptsDocument(transaction.doc, editor.state.doc)) return false;
        editor.view.dispatch(transaction.scrollIntoView());
        editor.view.dispatch(closeHistory(editor.state.tr));
        return true;
      },
      getHTML: () =>
        Promise.resolve(
          normalizeHtmlFromTiptap(
            editor.getHTML(),
            () => sanitizationConfigRef.current
          )
        ),
      toggleBold: () => runFocused(editor, (c) => c.toggleBold()),
      toggleItalic: () => runFocused(editor, (c) => c.toggleItalic()),
      toggleUnderline: () => runFocused(editor, (c) => c.toggleUnderline()),
      toggleStrikeThrough: () => runFocused(editor, (c) => c.toggleStrike()),
      toggleInlineCode: () => runFocused(editor, (c) => c.toggleCode()),
      toggleH1: () => runFocused(editor, (c) => c.toggleHeading({ level: 1 })),
      toggleH2: () => runFocused(editor, (c) => c.toggleHeading({ level: 2 })),
      toggleH3: () => runFocused(editor, (c) => c.toggleHeading({ level: 3 })),
      toggleH4: () => runFocused(editor, (c) => c.toggleHeading({ level: 4 })),
      toggleH5: () => runFocused(editor, (c) => c.toggleHeading({ level: 5 })),
      toggleH6: () => runFocused(editor, (c) => c.toggleHeading({ level: 6 })),
      toggleCodeBlock: () => runFocused(editor, (c) => c.toggleCodeBlock()),
      toggleBlockQuote: () => runFocused(editor, (c) => c.toggleBlockquote()),
      toggleOrderedList: () => runFocused(editor, (c) => c.toggleOrderedList()),
      toggleUnorderedList: () =>
        runFocused(editor, (c) => c.toggleUnorderedList()),
      toggleCheckboxList: (checked: boolean) =>
        runFocused(editor, (c) => c.toggleCheckboxList(checked)),
      setLink: (start: number, end: number, text: string, url: string) =>
        setLink(editor, start, end, text, url),
      removeLink: (start: number, end: number) =>
        removeLink(editor, start, end),
      startMention: (indicator: string) => {
        startMention(editor, indicator, mentionIndicatorsRef.current);
      },
      setMention: (
        indicator: string,
        text: string,
        attributes?: Record<string, string>
      ) => {
        checkMentionAttributes(attributes);
        setMention(
          editor,
          indicator,
          text,
          sanitizeMentionAttributes(attributes)
        );
      },
      setImage: (src: string, width: number, height: number) =>
        runFocused(editor, (c) => c.setImage({ src, width, height })),
      measure: () => {},
      measureInWindow: () => {},
      measureLayout: () => {},
      setNativeProps: () => {},
      setTextAlignment: (alignment) => {
        if (alignment === 'auto') {
          runFocused(editor, (c) => c.unsetTextAlign());
        } else {
          runFocused(editor, (c) => c.setTextAlign(alignment));
        }
      },
    }),
    [
      editor,
      acceptsDocument,
      mentionIndicatorsRef,
      useHtmlNormalizerRef,
      sanitizationConfigRef,
      onPasteRef,
    ]
  );

  const editorStyle: CSSProperties = useMemo(
    () => enrichedInputStyleToCSSProperties(style ?? {}, { scrollEnabled }),
    [scrollEnabled, style]
  );

  const cssVars = useMemo(
    () => htmlStyleToCSSVariables(resolvedHtmlStyle),
    [resolvedHtmlStyle]
  );

  const themingStyle = useMemo(
    (): CSSProperties =>
      enrichedInputThemingToCSSProperties({
        cursorColor,
        placeholderTextColor,
        selectionColor,
      }),
    [cursorColor, placeholderTextColor, selectionColor]
  );

  const mentionRulesCSS = useMemo(
    () => buildMentionRulesCSS(resolvedHtmlStyle),
    [resolvedHtmlStyle]
  );

  const finalStyle = useMemo(
    () => ({ ...editorStyle, ...cssVars, ...themingStyle }),
    [editorStyle, cssVars, themingStyle]
  );

  return (
    <>
      {mentionRulesCSS ? <style>{mentionRulesCSS}</style> : null}
      <EditorContent
        editor={editor}
        className={ENRICHED_TEXT_INPUT_CLASSNAME}
        style={finalStyle}
        data-placeholder={placeholder}
      />
    </>
  );
};
