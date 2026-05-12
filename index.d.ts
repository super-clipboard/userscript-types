/**
 * SuperClipboard userscript developer types.
 *
 * This entry point re-exports the **subset** of Tampermonkey GM APIs that
 * SuperClipboard implements, plus our additional clipboard / popover APIs.
 *
 * Usage in a script project:
 *
 * ```ts
 * /// <reference types="@super-clipboard/userscript-types" />
 * ```
 *
 * Or via tsconfig "types": ["@super-clipboard/userscript-types"].
 */
/// <reference path="./reference.d.ts" />

export {};
