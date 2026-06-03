# TypeScript Type Reference

All public types from `@super-clipboard/userscript-types`. These are
available as ambient declarations when you reference the package.

## Domain Types

### `ClipKind`

```ts
type ClipKind = "text" | "image" | "file";
```

Discriminator for clipboard entries. Used in `@match-clip`, event channels,
and type narrowing.

### `ClipRef`

```ts
interface ClipRef {
  hash: string;  // SHA-1 lowercase hex, content-addressed
  type: ClipKind;
}
```

Lightweight pointer to a clipboard entry. Never contains body data — always
call `getClipBody(ref)` to read content.

### `ClipFile`

```ts
interface ClipFile {
  name: string;
  path: string;        // absolute path on local filesystem
  isFile: boolean;
  isDirectory: boolean;
}
```

A single file/directory entry inside a `"file"`-type clip body.

## Body Types (Tagged Union)

### `ClipTextBody`

```ts
interface ClipTextBody {
  type: "text";
  preview?: string;  // short truncated preview, always populated
  text?: string;     // full text; may be absent for very large clips
}
```

### `ClipImageBody`

```ts
interface ClipImageBody {
  type: "image";
  preview?: string;
  bytes?: Uint8Array;  // full image bytes
  mime?: string;       // e.g. "image/png"
}
```

### `ClipFileBody`

```ts
interface ClipFileBody {
  type: "file";
  preview?: string;
  files?: ClipFile[];
}
```

### `ClipBodyContent`

```ts
type ClipBodyContent = ClipTextBody | ClipImageBody | ClipFileBody;
```

Return type of `getClipBody()`. Always switch on `.type`:

```ts
const body = await globalNativeApi.getClipBody(ref);
if (!body) return;
switch (body.type) {
  case "text":  /* body.text */    break;
  case "image": /* body.bytes */   break;
  case "file":  /* body.files */   break;
}
```

## Event Types

### `ClipboardAddedEvent`

```ts
interface ClipboardAddedEvent {
  hash: string;
  type: ClipKind;
}
```

Extends `ClipRef` with no extra fields (reserved for future metadata).

### `ClipboardEventMap`

```ts
interface ClipboardEventMap {
  added: ClipboardAddedEvent;
  text: ClipboardAddedEvent;
  image: ClipboardAddedEvent;
  file: ClipboardAddedEvent;
}
```

Channel-name → payload map for `addClipboardListener`.

## Menu Types

### `MenuCallbackContext`

```ts
interface MenuCallbackContext {
  trigger?: ClipRef;           // clip the menu was anchored to
  clips: readonly ClipRef[];   // user's selection when menu opened (always array)
}
```

Passed to menu command callbacks.

### `MenuMatcherContext`

```ts
interface MenuMatcherContext {
  trigger?: ClipRef;
  clips: readonly ClipRef[];
  bodies: ReadonlyMap<string, ClipTextBody | ClipFileBody>;
}
```

Passed to `options.matcher`. Note: `bodies` only contains text/link/html/file
bodies (synchronously available in-memory cache). Image bytes are NOT
accessible from a matcher.

### `MenuCommandCallback`

```ts
type MenuCommandCallback = (ctx: MenuCallbackContext) => void | Promise<void>;
```

### `MenuCommandOptions`

```ts
interface MenuCommandOptions {
  matcher?: (ctx: MenuMatcherContext) => boolean;
}
```

Command-level options. The `matcher` must be a pure synchronous function.

## I/O Types

### `ToastOptions`

```ts
interface ToastOptions {
  title?: string;
  body?: string;
  timeoutMs?: number;
}
```

### `SaveFileOptions`

```ts
interface SaveFileOptions {
  filename: string;
  mime?: string;
  targetDir?: string;
}
```

### `SaveFileContent`

```ts
type SaveFileContent = string | Uint8Array | ArrayBuffer;
```

## Panel Types

### `PanelPlacement`

```ts
type PanelPlacement = "menu-anchor" | "center" | "right" | "bottom";
```

### `PanelOptions`

```ts
interface PanelOptions {
  width?: number | "auto";
  height?: number | "auto";
  placement?: PanelPlacement;
  closeOnOutside?: boolean;
  modal?: boolean;
  transitionMs?: number;
}
```

### `PanelResizeOptions`

```ts
interface PanelResizeOptions {
  width?: number | "auto";
  height?: number | "auto";
}
```

## Script Meta

### `ScriptInfo`

```ts
interface ScriptInfo {
  readonly scriptId: string;
  readonly name: string;
  readonly namespace?: string;
  readonly version: string;
  readonly description?: string;
  readonly author?: string;
  readonly runAt: "foreground" | "background";
  readonly grants: string[];
}
```

Returned by `globalNativeApi.info`. Frozen at injection time.

## Global Interface

### `GlobalNativeApi`

```ts
interface GlobalNativeApi {
  // Menu
  registerMenuCommand(name: string, callback: MenuCommandCallback, options?: MenuCommandOptions): string;
  unregisterMenuCommand(commandId: string): void;

  // Events
  addClipboardListener<K extends keyof ClipboardEventMap>(event: K, handler: (payload: ClipboardEventMap[K]) => void | Promise<void>): void;
  removeClipboardListener(event: string, handler: (...args: unknown[]) => unknown): void;

  // Data
  getClipBody(clip: ClipRef): Promise<ClipBodyContent | null>;
  setClipMetadata(clip: ClipRef, partial: Record<string, unknown>): Promise<void>;
  setClipOcrText(hash: string, ocrText: string): Promise<void>;

  // KV
  setValue<T>(key: string, value: T): Promise<void>;
  getValue<T = unknown>(key: string): Promise<T | undefined>;
  deleteValue(key: string): Promise<void>;
  listValues(): Promise<string[]>;

  // I/O
  toast(options: ToastOptions | string): Promise<void>;
  saveFile(content: SaveFileContent, options: SaveFileOptions): Promise<void>;
  copyLocalFile(srcPath: string, destPath: string): Promise<void>;

  // Panel
  showPanel(options: PanelOptions): Promise<void>;
  resizePanel(size: PanelResizeOptions): void;
  closePanel(): Promise<void>;

  // Meta
  readonly info: ScriptInfo;
}
```
