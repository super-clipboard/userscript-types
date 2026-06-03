# UserScript Metadata Headers

Complete specification of the `==UserScript==` metadata block used by
SuperClipboard userscripts. Every `.user.js` file must begin with this block.

## Required Fields

| Header | Example | Notes |
|--------|---------|-------|
| `@name` | `My Script` | Display name, must be unique-ish for the user's library |
| `@version` | `1.0.0` | SemVer string; used for update checks |
| `@run-at` | `foreground` | `foreground` or `background` (see below) |
| `@grant` | `globalNativeApi.toast` | At least one grant; repeat for each API method used |

## Run-at Modes

### `foreground`

- The script loads when the uTools plugin window opens.
- Can call `registerMenuCommand` to add right-click menu items.
- Can call `showPanel` to open a floating iframe.
- Use for interactive scripts that need the user's selection.

### `background`

- The script loads on plugin startup and stays resident.
- **Cannot** call `registerMenuCommand` (no UI context).
- Can call `addClipboardListener` to react to clipboard events.
- Can use KV storage, `setClipOcrText`, and file I/O.
- Use for always-on listeners, OCR backfill, periodic tasks.

## Optional Metadata Fields

| Header | Example | Notes |
|--------|---------|-------|
| `@description` | `Formats JSON clips` | Shown in the script list |
| `@author` | `your-name` | Attribution |
| `@icon` | `data:image/svg+xml,...` | Inline icon (data URI) |
| `@namespace` | `https://example.com/` | Legacy identifier; **not** used for KV isolation |
| `@match-clip` | `text,image` | Comma-separated `ClipKind` list; filters which clips trigger the script |
| `@require` | `https://cdn.jsdelivr.net/npm/qrcode@1/build/qrcode.min.js#sha256-…` | External dependency loaded before the script runs |
| `@timeout` | `60000` | Max callback duration in ms (default 30000, max 120000) |

## Grant System

### Fine-grained grants (preferred)

```ts
// @grant globalNativeApi.toast
// @grant globalNativeApi.getClipBody
// @grant globalNativeApi.registerMenuCommand
// @grant utools.copyText
```

List each method you call. The host enforces grants at runtime — calling an
ungranted method throws `GRANT_DENIED`.

### Wildcard grants

```ts
// @grant globalNativeApi.*
// @grant utools.*
```

Shorthand for all methods in a namespace. However, a host-enforced denylist
blocks sensitive methods (e.g., `utools.db*`, payment methods). Unknown
grant values are silently ignored during loading.

### Grant format

```
<namespace>.<method-or-wildcard>
```

- `namespace` — `utools` or `globalNativeApi`
- `method-or-wildcard` — specific method name or `*`

## match-clip Filter

Comma-separated list of `ClipKind` values:

```ts
// @match-clip text
// @match-clip text,image
// @match-clip text,image,file
```

- Empty or omitted means "accept all clip kinds".
- The filter applies to ALL clips in the current selection — every clip must
  match for a menu command to appear.
- For finer control, use `options.matcher` on individual commands.

## require Directive

```ts
// @require https://cdn.jsdelivr.net/npm/qrcode@1/build/qrcode.min.js#sha256-abc123…
```

- Loads external JavaScript before the script body executes.
- **Always pin with a SRI hash** (`#sha256-…`) for security and determinism.
- Multiple `@require` lines are supported; they load in declaration order.
- The dependency is evaluated in the script's sandbox scope — globals it
  creates are available to the script body.

## Complete Example

```ts
// ==UserScript==
// @name         QR Code Generator
// @version      1.2.0
// @description  Generates a QR code from any text clip.
// @author       dev-team
// @run-at       foreground
// @match-clip   text
// @grant        globalNativeApi.registerMenuCommand
// @grant        globalNativeApi.getClipBody
// @grant        globalNativeApi.showPanel
// @grant        globalNativeApi.toast
// @grant        utools.copyText
// @require      https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js#sha256-…
// @timeout      45000
// ==/UserScript==

globalNativeApi.registerMenuCommand(
  "Show QR",
  async (ctx) => {
    const ref = ctx.clips[0];
    if (ref?.type !== "text") return;
    const body = await globalNativeApi.getClipBody(ref);
    if (body?.type !== "text" || !body.text) return;

    const dataUrl = await QRCode.toDataURL(body.text);
    document.body.innerHTML = `<img src="${dataUrl}" />`;
    await globalNativeApi.showPanel({ width: 280, height: "auto", placement: "center" });
  },
);
```
