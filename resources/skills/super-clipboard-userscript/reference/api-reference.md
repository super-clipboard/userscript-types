# API Reference

Every method on `globalNativeApi`, organized by category. All signatures
are synchronous unless marked with `Promise<>`.

> This is a condensed reference. Auto-generated TypeDoc output with full
> parameter tables is at `refs/docs/reference/api/`.

## Table of Contents

- [Menu](#menu)
- [Events](#events)
- [Data](#data)
- [KV Storage](#kv-storage)
- [I/O](#io)
- [Panel](#panel)
- [Meta](#meta)

---

## Menu

### `registerMenuCommand(name, callback, options?)`

Register a context-menu entry on clip rows. Returns a string command ID.

```ts
const id: string = globalNativeApi.registerMenuCommand(
  caption: string,
  callback: (ctx: MenuCallbackContext) => void | Promise<void>,
  options?: MenuCommandOptions,
);
```

- **`caption`** — Display text in the right-click menu.
- **`callback`** — Runs when the user clicks the menu item. Receives
  `MenuCallbackContext` with `clips: ClipRef[]` and optional `trigger`.
- **`options.matcher`** — Synchronous predicate. Must be pure (no
  `async`/`await`, no closure variables outside `ctx`). Executed in host
  scope after `@match-clip` already passed. Return `true` to show the
  command.
- **Return value** — String ID; does **not** persist across restarts.
  Re-register on every launch.

### `unregisterMenuCommand(id)`

```ts
globalNativeApi.unregisterMenuCommand(id: string): void
```

Unknown IDs are no-ops, never throw.

---

## Events

### `addClipboardListener(event, handler)`

```ts
globalNativeApi.addClipboardListener(
  event: "added" | "text" | "image" | "file",
  handler: (e: ClipboardAddedEvent) => void | Promise<void>,
): void
```

- **`"added"`** — Any type; fires on every new clip.
- **`"text"`** — Text clips only.
- **`"image"`** — Image clips only.
- **`"file"`** — File clips only.
- `e` is a `ClipRef` ({hash, type}) — call `getClipBody` to get content.
- Available in both `foreground` and `background` modes.

### `removeClipboardListener(event, handler)`

```ts
globalNativeApi.removeClipboardListener(
  event: string,
  handler: (...args: unknown[]) => unknown,
): void
```

Pass the **same function reference** used in `addClipboardListener`.

---

## Data

### `getClipBody(ref)`

```ts
const body: ClipBodyContent | null = await globalNativeApi.getClipBody(
  clip: ClipRef,
): Promise<ClipBodyContent | null>
```

Returns a tagged union — branch on `body.type`:

- `body.type === "text"` → `{ type: "text", text?: string, preview?: string }`
- `body.type === "image"` → `{ type: "image", bytes?: Uint8Array, mime?: string }`
- `body.type === "file"` → `{ type: "file", files?: ClipFile[] }`

Returns `null` when the clip has been cleaned up by the host.

### `setClipMetadata(ref, partial)`

```ts
await globalNativeApi.setClipMetadata(
  clip: ClipRef,
  partial: Record<string, unknown>,
): Promise<void>
```

> **@deprecated** — Prefer `setClipOcrText` for OCR data. This writes to
> a per-script `scriptData` bag that is NOT visible to other scripts or
> host search.

Shallow-merges `partial` into the clip's per-script metadata. Pass explicit
`null` value to clear a key.

### `setClipOcrText(hash, ocrText)`

```ts
await globalNativeApi.setClipOcrText(
  hash: string,
  ocrText: string,
): Promise<void>
```

Writes to the host-owned `ocr/{hash}` document — shared across all scripts
and consumed by the built-in image text search. Pass empty string to record
a negative result (suppresses re-runs).

---

## KV Storage

Per-script-identity key-value store, isolated by install-source URL hash.

### `setValue(key, value)`

```ts
await globalNativeApi.setValue<T>(key: string, value: T): Promise<void>
```

Values are JSON-serialized — don't store `Map`/`Set`/functions.

### `getValue(key)`

```ts
const val: T | undefined = await globalNativeApi.getValue<T = unknown>(
  key: string,
): Promise<T | undefined>
```

Returns `undefined` when the key is unset.

### `deleteValue(key)`

```ts
await globalNativeApi.deleteValue(key: string): Promise<void>
```

No-op when the key is unset.

### `listValues()`

```ts
const keys: string[] = await globalNativeApi.listValues(): Promise<string[]>
```

Enumerate all keys in this script's identity scope.

---

## I/O

### `toast(options | string)`

```ts
await globalNativeApi.toast(
  options: ToastOptions | string,
): Promise<void>
```

Shows an in-app toast via the host's built-in UI. **Not** a Web
`Notification` or OS-level notification.

```ts
interface ToastOptions {
  title?: string;
  body?: string;
  timeoutMs?: number; // auto-dismiss after ms
}
```

A bare string is treated as `{ body: string }`.

### `saveFile(content, options)`

```ts
await globalNativeApi.saveFile(
  content: string | Uint8Array | ArrayBuffer,
  options: SaveFileOptions,
): Promise<void>

interface SaveFileOptions {
  filename: string;
  mime?: string;
  targetDir?: string; // write directly to path (Node env)
}
```

Without `targetDir`, falls back to a browser download dialog. The final
path is not returned in that case.

### `copyLocalFile(srcPath, destPath)`

```ts
await globalNativeApi.copyLocalFile(
  srcPath: string,
  destPath: string,
): Promise<void>
```

Copies a local file or directory recursively. Requires the Node environment
provided by uTools.

---

## Panel

Each script has exactly **one** dedicated iframe. `showPanel` changes its
style and visibility; the DOM is preserved across close/show cycles.

### `showPanel(options)`

```ts
await globalNativeApi.showPanel(options: PanelOptions): Promise<void>

interface PanelOptions {
  width?: number | "auto";      // default: 320
  height?: number | "auto";     // default: 240
  placement?: PanelPlacement;   // default: "right"
  closeOnOutside?: boolean;     // default: true
  modal?: boolean;              // default: false
  transitionMs?: number;
}

type PanelPlacement = "menu-anchor" | "center" | "right" | "bottom";
```

- `"menu-anchor"` — anchored to the menu/button that triggered the command.
- `"center"` — centered on screen.
- `"right"` / `"bottom"` — docked to viewport edge.
- `width`/`height` as `"auto"` follow the iframe body content size.

### `resizePanel(size)`

```ts
globalNativeApi.resizePanel(size: PanelResizeOptions): void

interface PanelResizeOptions {
  width?: number | "auto";
  height?: number | "auto";
}
```

No-op if the panel is not currently open.

### `closePanel()`

```ts
await globalNativeApi.closePanel(): Promise<void>
```

Hides the panel; does **not** destroy the iframe or its state.

---

## Meta

### `info`

```ts
const info: ScriptInfo = globalNativeApi.info;
// Readonly. Frozen at injection time.

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

Use for logging prefixes or conditional logic based on script identity.
