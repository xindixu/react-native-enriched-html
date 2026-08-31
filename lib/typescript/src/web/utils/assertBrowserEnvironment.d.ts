/**
 * `EnrichedText` and `EnrichedTextInput` rely on browser-only APIs (DOMParser,
 * DOMPurify, TipTap) and therefore cannot render without a DOM — e.g. during
 * server-side rendering (SSR). They are client-only components.
 *
 * This asserts a DOM is available and throws a clear error otherwise.
 */
export declare function assertBrowserEnvironment(componentName: string): void;
//# sourceMappingURL=assertBrowserEnvironment.d.ts.map