"use strict";

import { useOnEditorChange } from "./useOnEditorChange.js";
import { normalizeHtmlFromTiptap } from "../normalization/tiptapHtmlNormalizer.js";
export const useOnChangeHtml = (editor, getSanitizationConfig, onChangeHtml) => {
  useOnEditorChange(editor, onChangeHtml, e => normalizeHtmlFromTiptap(e.getHTML(), getSanitizationConfig));
};
//# sourceMappingURL=useOnChangeHtml.js.map