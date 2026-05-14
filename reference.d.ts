/**
 * Ambient declarations for SuperClipboard userscript runtime.
 *
 * Thin wrapper around `./spec.d.ts` (the single source of truth). This file
 * exists so userscripts can rely on `globalNativeApi` and the `SuperClipboard.*`
 * type aliases as ambient globals via:
 *
 * ```
 * /// <reference types="@super-clipboard/userscript-types" />
 * ```
 *
 * The host injects two globals into each script's sandbox iframe:
 *
 *   - `utools`           — A blacklisted subset of the official uTools API
 *                          (see `utools-api-types`). At runtime ALL calls
 *                          are routed through postMessage IPC and return
 *                          a `Promise`. This file types them with the
 *                          original (often-synchronous) signatures from
 *                          `utools-api-types` for ergonomics; treat the
 *                          return value as `Promise<T>` if you need to
 *                          await it.
 *   - `globalNativeApi`  — Project-specific surface (clipboard / KV /
 *                          panel / file IO). Methods here are explicitly
 *                          declared in {@link ./spec.d.ts}.
 *
 * Each global is only injected when the script's `@grant` line includes
 * the matching token (`utools.*` / `globalNativeApi.*`).
 */

/// <reference types="utools-api-types" />

import type { SuperClipboard as Spec } from "./spec";

export {};

declare global {
  /**
   * Project-specific API surface, injected when the script grants
   * `globalNativeApi.*`. `undefined` otherwise.
   */
  const globalNativeApi: Spec.GlobalNativeApi;

  /**
   * Re-exposed under its original namespace so existing scripts can
   * continue to write `SuperClipboard.ClipRef` etc.
   *
   * The actual definitions live in {@link ./spec.d.ts} and are imported
   * verbatim — keep that file as the single source of truth and never
   * fork the shapes here.
   */
  namespace SuperClipboard {
    export type ClipKind = Spec.ClipKind;
    export type ClipRef = Spec.ClipRef;
    export type ClipFile = Spec.ClipFile;
    export type ClipTextBody = Spec.ClipTextBody;
    export type ClipFileBody = Spec.ClipFileBody;
    export type ClipImageBody = Spec.ClipImageBody;
    export type ClipBodyContent = Spec.ClipBodyContent;
    export type ClipMeta = Spec.ClipMeta;
    export type ClipboardAddedEvent = Spec.ClipboardAddedEvent;
    export type ClipboardEventMap = Spec.ClipboardEventMap;
    export type AppEventMap = Spec.AppEventMap;
    export type PanelEventMap = Spec.PanelEventMap;
    export type MenuCallbackContext = Spec.MenuCallbackContext;
    export type MenuCommandCallback = Spec.MenuCommandCallback;
    export type MenuCommandOptions = Spec.MenuCommandOptions;
    export type NotificationOptions = Spec.NotificationOptions;
    export type SaveFileOptions = Spec.SaveFileOptions;
    export type SaveFileContent = Spec.SaveFileContent;
    export type PanelPlacement = Spec.PanelPlacement;
    export type PanelOptions = Spec.PanelOptions;
    export type PanelResizeOptions = Spec.PanelResizeOptions;
    export type ScriptInfo = Spec.ScriptInfo;
    export type GlobalNativeApi = Spec.GlobalNativeApi;
  }

  // Convenient root aliases so scripts can reference these without the
  // `SuperClipboard.` prefix (mirrors previous developer ergonomics).
  type ClipRef = Spec.ClipRef;
  type ClipKind = Spec.ClipKind;
  type MenuCallbackContext = Spec.MenuCallbackContext;
  type ScriptInfo = Spec.ScriptInfo;
}
