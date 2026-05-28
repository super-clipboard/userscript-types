/**
 * Module-form spec for the SuperClipboard userscript runtime.
 *
 * This file is the **single source of truth** for the API surface. The
 * ambient version (`reference.d.ts`) is a thin wrapper that re-exposes
 * these declarations as global types and the `globalNativeApi` constant.
 *
 * Import this module (e.g. from the host implementation) to get type
 * contracts for the bridge router and sandbox bootstrap:
 *
 * ```ts
 * import type { SuperClipboard } from "@super-clipboard/userscript-types/spec";
 * const api: SuperClipboard.GlobalNativeApi = { ... };
 * ```
 */

export namespace SuperClipboard {
  // ── Domain types reused across declarations ─────────────────────────

  /**
   * Discriminator for clipboard entries.
   *
   * - `"text"`  — plain UTF-8 text
   * - `"image"` — PNG / JPEG bytes (decoded thumbnails are rendered by the host)
   * - `"file"`  — one or more file system paths
   */
  type ClipKind = "text" | "image" | "file";

  /**
   * Lightweight pointer to a clipboard entry.
   *
   * `hash` is content-addressed (SHA-1 over the canonical bytes), so the same
   * content always shares the same `hash` regardless of when it was copied.
   *
   * @example
   * ```ts
   * const ref: ClipRef = { hash: "a3f1c2…", type: "text" };
   * const text = await globalNativeApi.getClipBody(ref);
   * ```
   */
  interface ClipRef {
    /** Content hash (SHA-1, lowercase hex). Stable across sessions. */
    hash: string;
    /** Discriminates which body shape `getClipBody` will return. */
    type: ClipKind;
  }

  /**
   * A single file or directory entry inside a `"file"` clipboard payload.
   *
   * @example
   * ```ts
   * const body = await globalNativeApi.getClipBody(ref);
   * if (body?.type === "file") {
   *   for (const f of body.files ?? []) {
   *     if (f.isFile) console.log("file:", f.path);
   *   }
   * }
   * ```
   */
  interface ClipFile {
    /** Base name (no parent directories). */
    name: string;
    /** Absolute path on the local filesystem. */
    path: string;
    isFile: boolean;
    isDirectory: boolean;
  }

  /**
   * Body returned by {@link GlobalNativeApi.getClipBody} for a `"text"` clip.
   *
   * - `preview` — short truncated preview always populated by the host.
   * - `text`    — full text body; may be omitted for very large clips that
   *               weren't pre-loaded (rare; treat absence as "not available").
   */
  interface ClipTextBody {
    type: "text";
    preview?: string;
    text?: string;
  }

  /** Body returned by {@link GlobalNativeApi.getClipBody} for a `"file"` clip. */
  interface ClipFileBody {
    type: "file";
    preview?: string;
    files?: ClipFile[];
  }

  /** Body returned by {@link GlobalNativeApi.getClipBody} for an `"image"` clip. */
  interface ClipImageBody {
    type: "image";
    preview?: string;
    /** Raw image bytes when available. */
    bytes?: Uint8Array;
    /** MIME type, e.g. `"image/png"`. */
    mime?: string;
  }

  /**
   * Tagged union returned by {@link GlobalNativeApi.getClipBody}. Discriminate
   * on `body.type` to access the kind-specific fields.
   *
   * @example
   * ```ts
   * const body = await globalNativeApi.getClipBody(ref);
   * if (!body) return;
   * switch (body.type) {
   *   case "text":  console.log(body.text); break;
   *   case "image": console.log(body.bytes?.byteLength); break;
   *   case "file":  console.log(body.files?.length); break;
   * }
   * ```
   */
  type ClipBodyContent = ClipTextBody | ClipFileBody | ClipImageBody;

  /**
   * Metadata associated with a clip. Carried inside {@link ClipboardAddedEvent}
   * and other clip-related payloads.
   *
   * `scriptData` is a free-form bag keyed by script `@namespace`; use
   * {@link GlobalNativeApi.setClipMetadata} to write into your own namespace.
   *
   * @example
   * ```ts
   * globalNativeApi.addClipboardListener("added", (e) => {
   *   console.log(e.sourceAppName, new Date(e.createdAt));
   * });
   * ```
   */
  interface ClipMeta {
    hash: string;
    type: ClipKind;
    /** Unix epoch milliseconds when the clip first entered history. */
    createdAt: number;
    /**
     * Sort key (Unix epoch ms). Equal to `createdAt` for fresh clips, but
     * updated when a duplicate is re-copied — newer copies float to the top.
     */
    sortAt: number;
    /** Stable id of the device that captured this clip. */
    sourceDeviceId: string;
    /** Bundle id / executable name reported by the OS, if available. */
    sourceApp?: string;
    /** Human-readable app name, if available. */
    sourceAppName?: string;
    /** MIME type for image clips, optional otherwise. */
    mime?: string;
    /** Byte size of the body (text length / image bytes / sum of file sizes). */
    size?: number;
    /** Internal id of the body record, format: `clip-body/<hash>`. */
    bodyId?: string;
    /** Aggregated namespace -> data map populated by background scripts. */
    scriptData?: Record<string, Record<string, unknown>>;
  }

  // ── Events ────────────────────────────────────────────────────────────

  /**
   * Fired when a new clip is captured. Same payload is delivered on the
   * generic `"added"` channel and on the kind-specific channel
   * (`"text"` / `"image"` / `"file"`).
   *
   * Currently the host emits a {@link ClipRef} — `hash` and `type` only.
   * Future versions may extend with extra fields; treat this interface as
   * the minimum guaranteed shape.
   */
  interface ClipboardAddedEvent extends ClipRef {}

  /**
   * Channel-name → payload map for {@link GlobalNativeApi.addClipboardListener}.
   *
   * @example
   * ```ts
   * globalNativeApi.addClipboardListener("text", (e) => {
   *   console.log("new text clip", e.hash);
   * });
   * ```
   */
  interface ClipboardEventMap {
    added: ClipboardAddedEvent;
    text: ClipboardAddedEvent;
    image: ClipboardAddedEvent;
    file: ClipboardAddedEvent;
  }

  /**
   * Channel-name → payload map for {@link GlobalNativeApi.addAppListener}.
   *
   * **Reserved for future use.** The runtime exposes this listener API but
   * the host currently emits no `app:*` events. Subscribing today is a no-op.
   */
  interface AppEventMap {
    /** Reserved. Will fire after host startup completes. */
    ready: Record<string, never>;
    /** Reserved. Will fire when the main window becomes visible. */
    visible: Record<string, never>;
    /** Reserved. Will fire when the main window is hidden. */
    hidden: Record<string, never>;
  }

  /**
   * Channel-name → payload map for {@link GlobalNativeApi.addPanelListener}.
   *
   * **Reserved for future use.** The runtime exposes this listener API but
   * the host currently emits no `panel:*` events. Subscribing today is a no-op.
   */
  interface PanelEventMap {
    /** Reserved. Will fire when the panel is closed (by user or `closePanel()`). */
    closed: Record<string, never>;
    /** Reserved. Will fire when the panel size changes. */
    resize: { width: number; height: number };
  }

  // ── Menu commands ─────────────────────────────────────────────────────

  /**
   * Context object passed to a menu command callback.
   *
   * - `clips`   — the user's selection at the moment the menu was opened.
   *               **Always an array**: length 1 in single-select, length N in
   *               multi-select. Iterate over it instead of assuming a single
   *               clip.
   * - `trigger` — the specific clip that the menu was anchored to (the one
   *               the user right-clicked / focused). When opening a panel,
   *               anchor positioning is computed against this clip. May be
   *               absent when the command was triggered without a clip
   *               anchor (e.g. a future global menu entry).
   *
   * @example
   * ```ts
   * globalNativeApi.registerMenuCommand("Save first as image", async (ctx) => {
   *   const target = ctx.clips[0];
   *   if (target?.type !== "image") return;
   *   const body = await globalNativeApi.getClipBody(target);
   *   if (body?.type === "image" && body.bytes) {
   *     await globalNativeApi.saveFile(body.bytes, { filename: "clip.png", mime: "image/png" });
   *   }
   * });
   * ```
   */
  interface MenuCallbackContext {
    /**
     * The clip the menu was anchored to. Use this for positional anchors
     * (e.g. `showPanel`). Always one of the entries in {@link clips} when present.
     */
    trigger?: ClipRef;
    /**
     * All clips the command should operate on. Length 1 in single-select,
     * length N in multi-select. Never empty in current builds.
     */
    clips: readonly ClipRef[];
  }

  type MenuCommandCallback = (ctx: MenuCallbackContext) => void | Promise<void>;

  /**
   * Per-command options. Defaults to "show on every kind, no access key".
   *
   * @example
   * ```ts
   * globalNativeApi.registerMenuCommand("Decode QR", onDecode, {
   *   matchClip: ["image"],
   *   accessKey: "Q",
   * });
   * ```
   */
  interface MenuCommandOptions {
    /** Restrict visibility to specific clip kinds. Overrides `@match-clip`. */
    matchClip?: ClipKind[];
    /** Single-character access key shown in the menu. */
    accessKey?: string;
  }

  // ── Notifications ─────────────────────────────────────────────────────

  /**
   * Options for {@link GlobalNativeApi.notification}. All fields are
   * best-effort and may be ignored on some platforms.
   *
   * The host also accepts a bare string at the call site, equivalent to
   * `{ body: <string> }`.
   *
   * @example
   * ```ts
   * await globalNativeApi.notification({
   *   title: "Done",
   *   body: "Saved to ~/Downloads/clip.png",
   *   timeoutMs: 4000,
   * });
   * await globalNativeApi.notification("Saved!"); // body shorthand
   * ```
   */
  interface NotificationOptions {
    title?: string;
    body?: string;
    /** Auto-dismiss after this many milliseconds. Platform default if omitted. */
    timeoutMs?: number;
  }

  // ── Save file ─────────────────────────────────────────────────────────

  /**
   * Options for {@link GlobalNativeApi.saveFile}. `mime` drives the default
   * extension when present.
   */
  interface SaveFileOptions {
    /** Suggested filename in the save dialog. */
    filename: string;
    /** MIME type hint, e.g. `"image/png"` or `"text/plain"`. */
    mime?: string;
    /** Optional target directory path to write directly in supported Node environments. */
    targetDir?: string;
  }

  type SaveFileContent = string | Uint8Array | ArrayBuffer;

  // ── Self-rendered Panel (脚本在自身 iframe 内绘制) ─────────────────────

  /**
   * Where to anchor the script's panel.
   *
   * - `"menu-anchor"` — open next to the menu/button that triggered the script.
   * - `"center"`      — fixed-centred relative to the host window.
   * - `"right"`       — pinned to the bottom-right corner (default).
   * - `"bottom"`      — pinned to the bottom-centre.
   */
  type PanelPlacement = "menu-anchor" | "center" | "right" | "bottom";

  /**
   * Options for {@link GlobalNativeApi.showPanel}. The panel is your script's
   * existing iframe — the host only changes its size, position and stacking;
   * it does NOT reparent the iframe (so DOM state survives panel toggles).
   *
   * @example
   * ```ts
   * await globalNativeApi.showPanel({ width: 320, height: "auto", placement: "center" });
   * ```
   */
  interface PanelOptions {
    /** Width in pixels, or `"auto"` to follow body content. Default 320. */
    width?: number | "auto";
    /** Height in pixels, or `"auto"` to follow body scrollHeight. Default 240. */
    height?: number | "auto";
    /** Default `"right"`. */
    placement?: PanelPlacement;
    /** Default `true`. */
    closeOnOutside?: boolean;
    /** Default `false`. */
    modal?: boolean;
    /** Optional CSS transition duration. */
    transitionMs?: number;
  }

  /**
   * Subset of {@link PanelOptions} accepted by
   * {@link GlobalNativeApi.resizePanel}. Either dimension may be omitted to
   * keep its current value; `"auto"` follows the iframe's body content size.
   */
  interface PanelResizeOptions {
    width?: number | "auto";
    height?: number | "auto";
  }

  // ── Script self-info ──────────────────────────────────────────────────

  /**
   * Snapshot of the host-assigned identity & metadata of the running script.
   * Read via {@link GlobalNativeApi.info}.
   *
   * @example
   * ```ts
   * console.log(`[${globalNativeApi.info.name} v${globalNativeApi.info.version}]`);
   * ```
   */
  interface ScriptInfo {
    /** Stable id (`config/script/<sha1-16hex>`). */
    scriptId: string;
    name: string;
    namespace: string;
    version: string;
    description?: string;
    author?: string;
    runAt: "foreground" | "background";
    /**
     * Tokens declared via `@grant`, as authored by the script.
     *
     * Each entry has the shape `<namespace>.<method-or-wildcard>` where
     * `<namespace>` is `"utools"` or `"globalNativeApi"`. Fine-grained tokens
     * (e.g. `"utools.copyText"`, `"globalNativeApi.notification"`) are
     * recommended; the coarse wildcards `"utools.*"` / `"globalNativeApi.*"`
     * are also accepted but subject to a denylist enforced by the host.
     */
    grants: string[];
  }

  // ── globalNativeApi shape ────────────────────────────────────────────

  /**
   * Project-specific API surface, injected as the global `globalNativeApi`
   * when the script declares `@grant globalNativeApi.*`.
   *
   * All methods that perform IO return `Promise`. Synchronous methods are
   * documented as such (`registerMenuCommand`, the listener registrations,
   * `unregisterMenuCommand`, `log`, `info`).
   */
  interface GlobalNativeApi {
    // —— 菜单 / 订阅（同步注册） ———————————————————————————————

    /**
     * Register a command that appears in the right-click menu of clip items.
     *
     * Synchronous. The returned `commandId` can later be passed to
     * {@link unregisterMenuCommand}.
     *
     * @param name     Display name shown in the menu.
     * @param callback Invoked when the user picks the command.
     * @param options  Optional kind filter / access key.
     * @returns        Opaque command id (not stable across reloads).
     *
     * @example
     * ```ts
     * const id = globalNativeApi.registerMenuCommand("Copy as link", async (ctx) => {
     *   const target = ctx.clips[0];
     *   if (target?.type !== "text") return;
     *   const body = await globalNativeApi.getClipBody(target);
     *   if (body?.type === "text" && body.text) utools.copyText(`<${body.text}>`);
     * });
     * ```
     */
    registerMenuCommand(
      name: string,
      callback: MenuCommandCallback,
      options?: MenuCommandOptions,
    ): string;

    /**
     * Remove a previously-registered menu command. Synchronous; no-op when
     * the id is unknown.
     */
    unregisterMenuCommand(commandId: string): void;

    /**
     * Subscribe to clipboard events. The returned listener can be removed
     * via {@link removeClipboardListener}.
     *
     * @example
     * ```ts
     * const onAdded = (e: SuperClipboard.ClipboardAddedEvent) => {
     *   globalNativeApi.log("captured", e.type, e.hash);
     * };
     * globalNativeApi.addClipboardListener("added", onAdded);
     * // …later
     * globalNativeApi.removeClipboardListener("added", onAdded);
     * ```
     */
    addClipboardListener<K extends keyof ClipboardEventMap>(
      event: K,
      handler: (payload: ClipboardEventMap[K]) => void | Promise<void>,
    ): void;

    /** Inverse of {@link addClipboardListener}. Pass the same `handler` reference. */
    removeClipboardListener<K extends keyof ClipboardEventMap>(
      event: K,
      handler: (payload: ClipboardEventMap[K]) => void | Promise<void>,
    ): void;

    /**
     * Subscribe to host application lifecycle events.
     *
     * @example
     * ```ts
     * globalNativeApi.addAppListener("visible", () => {
     *   // refresh a panel each time the user opens the window
     * });
     * ```
     */
    addAppListener<K extends keyof AppEventMap>(
      event: K,
      handler: (payload: AppEventMap[K]) => void | Promise<void>,
    ): void;

    /**
     * Subscribe to events for the script's own panel (see {@link showPanel}).
     *
     * @example
     * ```ts
     * globalNativeApi.addPanelListener("closed", () => {
     *   // commit pending edits
     * });
     * ```
     */
    addPanelListener<K extends keyof PanelEventMap>(
      event: K,
      handler: (payload: PanelEventMap[K]) => void | Promise<void>,
    ): void;

    // —— 数据访问 ———————————————————————————————————————————

    /**
     * Read the body of a clip. Returns `null` when the clip is missing.
     *
     * The returned object is a {@link ClipBodyContent} tagged union; switch on
     * `body.type` to access the kind-specific fields (`text` / `bytes` / `files`).
     *
     * @example
     * ```ts
     * const body = await globalNativeApi.getClipBody(ref);
     * if (body?.type === "text") console.log(body.text);
     * if (body?.type === "image") console.log(body.bytes?.byteLength);
     * if (body?.type === "file") console.log(body.files?.map((f) => f.path));
     * ```
     */
    getClipBody(clip: ClipRef): Promise<ClipBodyContent | null>;

    /**
     * Merge `partial` into the clip's per-script metadata bag (isolated by
     * the script's frozen install identity, *not* by `@namespace`). The
     * write is shallow-merged; pass an explicit `null` value to clear a
     * particular key in a follow-up write.
     *
     * @deprecated Prefer a dedicated host API for the field you need.
     *   For OCR text, use {@link setClipOcrText} — it writes to the shared
     *   `ocr/{hash}` document the host uses for image text search, so the
     *   result is visible across scripts and survives uninstall.
     *   `setClipMetadata` remains for ad-hoc per-script annotations.
     *
     * @example
     * ```ts
     * await globalNativeApi.setClipMetadata(ref, { tag: "important" });
     * ```
     */
    setClipMetadata(clip: ClipRef, partial: Record<string, unknown>): Promise<void>;

    /**
     * Persist OCR text for an image clip identified by its content hash.
     *
     * Unlike {@link setClipMetadata} this writes to the host's dedicated
     * `ocr/{hash}` document, the same store consumed by the built-in image
     * text search. The text is content-addressed (keyed by `hash`), so all
     * clips that share the same image bytes see the same OCR result.
     *
     * @param hash Content hash of the image clip (e.g. `clip.hash`).
     * @param ocrText The recognised text. Pass an empty string to record a
     *   negative result (suppresses subsequent re-runs).
     *
     * @example
     * ```ts
     * await globalNativeApi.setClipOcrText(clip.hash, "hello world");
     * ```
     */
    setClipOcrText(hash: string, ocrText: string): Promise<void>;

    // —— KV（按 @namespace 隔离） ———————————————————————————————

    /**
     * Persistent key-value store, isolated per script `@namespace`.
     * Values are JSON-serialised; pass anything `JSON.stringify` accepts.
     *
     * @example
     * ```ts
     * await globalNativeApi.setValue("settings", { autoOpen: true });
     * const s = await globalNativeApi.getValue<{ autoOpen: boolean }>("settings");
     * ```
     */
    setValue<T>(key: string, value: T): Promise<void>;

    /**
     * Read a previously-stored value. Returns `undefined` when the key is
     * unset.
     */
    getValue<T = unknown>(key: string): Promise<T | undefined>;

    /** Remove a key. No-op when the key is unset. */
    deleteValue(key: string): Promise<void>;

    /** Enumerate all keys in this script's namespace. */
    listValues(): Promise<string[]>;

    // —— 输出 / IO ———————————————————————————————————————————

    /**
     * Show a system notification.
     *
     * Accepts either a {@link NotificationOptions} object or a bare string
     * (treated as `{ body: <string> }`).
     *
     * @example
     * ```ts
     * await globalNativeApi.notification({ title: "Saved", body: "1 file written" });
     * await globalNativeApi.notification("Saved!"); // body shorthand
     * ```
     */
    notification(options: NotificationOptions | string): Promise<void>;

    /**
     * Synchronous logger forwarded to the host's developer console with a
     * `[script:<namespace>]` prefix. Prefer this over `console.log` so output
     * is attributed to your script.
     */
    log(...args: unknown[]): void;

    /** Warning-level counterpart to {@link log}. */
    warn(...args: unknown[]): void;

    /** Error-level counterpart to {@link log}. */
    error(...args: unknown[]): void;

    /**
     * Save `content` as a file. The host currently triggers a browser-style
     * download via the iframe (no path is returned because the Web download
     * API does not expose the destination). A future native implementation
     * may extend this to return the absolute path.
     *
     * @example
     * ```ts
     * const body = await globalNativeApi.getClipBody(ref);
     * if (body?.type === "image" && body.bytes) {
     *   await globalNativeApi.saveFile(body.bytes, { filename: "clip.png", mime: "image/png" });
     * }
     * ```
     */
    saveFile(content: SaveFileContent, options: SaveFileOptions): Promise<void>;

    /**
     * Copy a local file or directory to a different path on disk in supported Node environments.
     * Recursively copies directories.
     */
    copyLocalFile(srcPath: string, destPath: string): Promise<void>;

    /**
     * Show the script's iframe as a floating panel. The iframe itself is the
     * panel; the host only changes its size/position/visibility. State inside
     * the iframe (DOM, JS variables) is preserved across `closePanel` /
     * `showPanel` cycles.
     *
     * @example
     * ```ts
     * await globalNativeApi.showPanel({ width: 360, height: "auto" });
     * ```
     */
    showPanel(options: PanelOptions): Promise<void>;

    /** Resize the currently-open panel. No-op when the panel is closed. */
    resizePanel(size: PanelResizeOptions): Promise<void>;

    /** Hide the panel without unmounting the iframe. */
    closePanel(): Promise<void>;

    // —— 脚本元信息（inline 注入） ————————————————————————————————

    /**
     * Read-only snapshot of the running script's identity, version and
     * grants. Populated synchronously at script start.
     */
    readonly info: ScriptInfo;
  }
}
