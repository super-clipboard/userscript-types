# Quick Start

Step-by-step guide to creating your first SuperClipboard userscript.

## 1. Create the File

Create a `.user.js` file. The `.user.js` extension is required for the host
to recognize it as a userscript.

```
my-script.user.js
```

## 2. Add the Metadata Header

Every script starts with a `==UserScript==` block. At minimum you need
`@name`, `@version`, `@run-at`, and the `@grant` lines for each API method
you call.

```ts
// ==UserScript==
// @name         My First Script
// @version      1.0.0
// @description  Shows a toast for every new text clip.
// @author       your-name
// @run-at       background
// @match-clip   text
// @grant        globalNativeApi.toast
// @grant        globalNativeApi.addClipboardListener
// ==/UserScript==
```

> **Run-at modes:**
> - `foreground` — can register menu commands; runs when the plugin opens.
> - `background` — runs on startup, stays resident. No menu commands.
>   Use for clipboard listeners, polling, or background tasks.

## 3. Write the Body

The script body is standard JavaScript. Two globals are injected:

- `globalNativeApi` — SuperClipboard-specific surface
- `utools` — denylisted subset of the uTools API

```ts
// Listen for every new text clip
globalNativeApi.addClipboardListener("text", async (e) => {
  // e is a ClipRef — a pointer, not the body.
  const body = await globalNativeApi.getClipBody(e);
  if (!body || body.type !== "text") return;

  // Show an in-app toast with a preview
  const preview = body.preview ?? body.text?.slice(0, 80) ?? "(empty)";
  await globalNativeApi.toast({ body: `New text: ${preview}` });
});

console.log("My First Script loaded.");
```

## 4. Register a Menu Command (foreground only)

If you use `@run-at foreground`, you can register commands that appear
when the user right-clicks a clip row:

```ts
// ==UserScript==
// @run-at       foreground
// @match-clip   text
// @grant        globalNativeApi.registerMenuCommand
// @grant        globalNativeApi.getClipBody
// @grant        globalNativeApi.toast
// @grant        utools.copyText
// ==/UserScript==

globalNativeApi.registerMenuCommand(
  "Copy as Markdown Link",
  async (ctx) => {
    // ctx.clips is the user's selection at menu-open time.
    const ref = ctx.clips[0];
    if (!ref || ref.type !== "text") return;

    const body = await globalNativeApi.getClipBody(ref);
    if (body?.type !== "text" || !body.text) return;

    const text = body.text.trim();
    const md = /^https?:\/\//i.test(text)
      ? `<${text}>`
      : `[link](${text})`;

    utools.copyText(md);
    await globalNativeApi.toast({ body: "Copied as Markdown" });
  },
  {
    // Matcher runs synchronously — filter before showing the menu item.
    matcher: (ctx) =>
      ctx.clips.length === 1 && ctx.clips[0].type === "text",
  },
);
```

## 5. Mount a Panel

A foreground script can open its own iframe as a floating panel:

```ts
globalNativeApi.registerMenuCommand(
  "Show QR Code",
  async (ctx) => {
    const ref = ctx.clips[0];
    if (ref?.type !== "text") return;
    const body = await globalNativeApi.getClipBody(ref);
    if (body?.type !== "text" || !body.text) return;

    // Render QR in the script's own iframe body.
    // Assumes qrcode is loaded via @require.
    const dataUrl = await QRCode.toDataURL(body.text);
    document.body.innerHTML = `<img src="${dataUrl}" />`;

    await globalNativeApi.showPanel({
      width: 280,
      height: "auto",
      placement: "center",
    });
  },
);
```

The panel's DOM is **preserved** across `closePanel` / `showPanel` cycles —
use it to maintain in-memory state.

## 6. Persist Data with KV Storage

Each script gets an isolated key-value store:

```ts
// Save settings
await globalNativeApi.setValue("settings", {
  autoOpen: true,
  theme: "dark",
});

// Read back (typed)
const settings = await globalNativeApi.getValue<{
  autoOpen: boolean;
  theme: string;
}>("settings");

if (settings) {
  console.log("Theme:", settings.theme);
}

// List all keys in this script's namespace
const keys = await globalNativeApi.listValues();
```

- Values are JSON-serialized — don't store `Map`, `Set`, or functions.
- Keys are isolated per script identity (install-source URL hash).
  `@namespace` is **not** the isolation key since v0.5.

## 7. Save a Clip to Disk

```ts
globalNativeApi.registerMenuCommand(
  "Save as PNG",
  async (ctx) => {
    const ref = ctx.clips[0];
    if (ref?.type !== "image") return;

    const body = await globalNativeApi.getClipBody(ref);
    if (body?.type !== "image" || !body.bytes) return;

    await globalNativeApi.saveFile(body.bytes, {
      filename: `clip-${ref.hash.slice(0, 8)}.png`,
      mime: "image/png",
    });

    await globalNativeApi.toast({ body: "Saved!" });
  },
);
```

- `targetDir` option writes directly to a directory (requires Node
  environment). Without it, falls back to a browser download dialog.

## TypeScript Setup

For editor autocompletion and type checking, reference the types package:

**Option 1** — Triple-slash at the top of your script:

```ts
/// <reference types="@super-clipboard/userscript-types" />
```

**Option 2** — In `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["@super-clipboard/userscript-types"]
  }
}
```

This injects the `globalNativeApi` global, the `SuperClipboard.*` namespace,
and `utools-api-types`.
