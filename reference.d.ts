/**
 * Ambient declarations for SuperClipboard userscript runtime.
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
 *                          declared below.
 *
 * Each global is only injected when the script's `@grant` line includes
 * the matching token (`utools.*` / `globalNativeApi.*`).
 */

/// <reference types="utools-api-types" />

// ────────────────────────────────────────────────────────────────────────────
// Domain types reused across declarations
// ────────────────────────────────────────────────────────────────────────────

declare namespace SuperClipboard {
  type ClipKind = "text" | "image" | "file";

  interface ClipRef {
    hash: string;
    type: ClipKind;
  }

  interface ClipBodyAsMap {
    text: string;
    bytes: Uint8Array;
    files: ClipFile[];
    meta: ClipMeta;
  }

  interface ClipFile {
    name: string;
    path: string;
    isFile: boolean;
    isDirectory: boolean;
  }

  interface ClipMeta {
    hash: string;
    type: ClipKind;
    createdAt: number;
    sourceApp?: string;
    sourceAppName?: string;
    /** Aggregated namespace -> data map populated by background scripts. */
    scriptData?: Record<string, Record<string, unknown>>;
  }

  // ── Events ────────────────────────────────────────────────────────────
  interface ClipboardAddedEvent extends ClipRef {
    source?: string;
  }
  interface ClipboardRemovedEvent {
    hash: string;
  }
  interface ClipboardMetadataUpdatedEvent {
    hash: string;
    namespace: string;
    partial: Record<string, unknown>;
  }
  interface ClipboardEventMap {
    added: ClipboardAddedEvent;
    text: ClipboardAddedEvent;
    image: ClipboardAddedEvent;
    file: ClipboardAddedEvent;
    removed: ClipboardRemovedEvent;
    "metadata-updated": ClipboardMetadataUpdatedEvent;
  }
  interface AppEventMap {
    ready: Record<string, never>;
    visible: Record<string, never>;
    hidden: Record<string, never>;
  }
  interface PanelEventMap {
    closed: Record<string, never>;
    resize: { width: number; height: number };
  }

  // ── Menu commands ─────────────────────────────────────────────────────
  interface MenuCallbackContext {
    /** Present when the script was triggered against a clip entry. */
    clip?: ClipRef;
    /** Present when triggered from a multi-select context. */
    batch?: { index: number; total: number };
  }
  type MenuCommandCallback = (ctx: MenuCallbackContext) => void | Promise<void>;
  interface MenuCommandOptions {
    /** Restrict visibility to specific clip kinds. Overrides `@match-clip`. */
    matchClip?: ClipKind[];
    /** Single-character access key shown in the menu. */
    accessKey?: string;
  }

  // ── Notifications ─────────────────────────────────────────────────────
  interface NotificationOptions {
    title: string;
    body?: string;
    icon?: string;
    timeoutMs?: number;
  }

  // ── Save file ─────────────────────────────────────────────────────────
  interface SaveFileOptions {
    filename: string;
    mime?: string;
  }
  type SaveFileContent = string | Uint8Array;
  interface SaveFileResult {
    path: string | null;
  }

  // ── Self-rendered Panel (脚本在自身 iframe 内绘制) ─────────────────────
  type PanelPlacement =
    | "menu-anchor"
    | "center"
    | { side: "top" | "bottom" | "left" | "right"; offset?: number };
  interface PanelOptions {
    /** 宽度（像素） */
    width: number;
    /** 高度像素，或 "auto" 表示跟随 body scrollHeight */
    height: number | "auto";
    /** 默认 menu-anchor */
    placement?: PanelPlacement;
    /** 默认 true */
    closeOnOutside?: boolean;
    /** 默认 false */
    modal?: boolean;
    /** 过渡动画时长 */
    transitionMs?: number;
  }
  interface PanelResizeOptions {
    width?: number;
    height?: number | "auto";
  }

  // ── Script self-info ──────────────────────────────────────────────────
  interface ScriptInfo {
    scriptId: string;
    name: string;
    namespace: string;
    version: string;
    description?: string;
    author?: string;
    runAt: "foreground" | "background";
    grants: ("utools.*" | "globalNativeApi.*")[];
  }

  // ── globalNativeApi shape ────────────────────────────────────────────
  interface GlobalNativeApi {
    // —— 菜单 / 订阅（同步注册） ———————————————————————————————
    registerMenuCommand(
      name: string,
      callback: MenuCommandCallback,
      options?: MenuCommandOptions,
    ): string;
    unregisterMenuCommand(commandId: string): void;
    addClipboardListener<K extends keyof ClipboardEventMap>(
      event: K,
      handler: (payload: ClipboardEventMap[K]) => void | Promise<void>,
    ): void;
    removeClipboardListener<K extends keyof ClipboardEventMap>(
      event: K,
      handler: (payload: ClipboardEventMap[K]) => void | Promise<void>,
    ): void;
    addAppListener<K extends keyof AppEventMap>(
      event: K,
      handler: (payload: AppEventMap[K]) => void | Promise<void>,
    ): void;
    addPanelListener<K extends keyof PanelEventMap>(
      event: K,
      handler: (payload: PanelEventMap[K]) => void | Promise<void>,
    ): void;

    // —— 数据访问 ———————————————————————————————————————————
    getClipBody<K extends keyof ClipBodyAsMap>(
      clip: ClipRef,
      as?: K,
    ): Promise<ClipBodyAsMap[K] | null>;
    setClipMetadata(clip: ClipRef, partial: Record<string, unknown>): Promise<void>;
    listClips(query?: { type?: ClipKind; sinceMs?: number; limit?: number }): Promise<ClipRef[]>;

    // —— KV（按 @namespace 隔离） ———————————————————————————————
    setValue<T>(key: string, value: T): Promise<void>;
    getValue<T = unknown>(key: string): Promise<T | undefined>;
    deleteValue(key: string): Promise<void>;
    listValues(): Promise<string[]>;

    // —— 输出 / IO ———————————————————————————————————————————
    notification(options: NotificationOptions): Promise<void>;
    log(...args: unknown[]): void;
    saveFile(content: SaveFileContent, options: SaveFileOptions): Promise<SaveFileResult>;
    showPanel(options: PanelOptions): Promise<void>;
    resizePanel(size: PanelResizeOptions): Promise<void>;
    closePanel(): Promise<void>;

    // —— 脚本元信息（inline 注入） ————————————————————————————————
    readonly info: ScriptInfo;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Globals — ambient
// ────────────────────────────────────────────────────────────────────────────

declare global {
  /**
   * Project-specific API surface, injected when the script grants
   * `globalNativeApi.*`. `undefined` otherwise.
   */
  const globalNativeApi: SuperClipboard.GlobalNativeApi;

  // Convenient root aliases so scripts can reference these without the
  // `SuperClipboard.` prefix (mirrors previous developer ergonomics).
  type ClipRef = SuperClipboard.ClipRef;
  type ClipKind = SuperClipboard.ClipKind;
  type MenuCallbackContext = SuperClipboard.MenuCallbackContext;
  type ScriptInfo = SuperClipboard.ScriptInfo;
}

export {};
