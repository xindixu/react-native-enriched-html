import { Extension } from '@tiptap/core';
import { type LinkEmitterState } from '../../tiptapWatchers/emitLinkDetected.js';
interface AutolinkPluginOptions {
    getLinkEmitter: () => LinkEmitterState;
}
export declare const AutolinkPlugin: Extension<AutolinkPluginOptions, any>;
export {};
//# sourceMappingURL=index.d.ts.map