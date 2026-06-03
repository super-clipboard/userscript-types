# Common Patterns & Recipes

Idiomatic patterns for common SuperClipboard userscript tasks. Each recipe
is a self-contained, copy-paste-ready snippet with the required grants.

## Pattern Index

- [Foreground: Menu Command with Clipboard Action](#foreground-menu-command-with-clipboard-action)
- [Foreground: Command-Level Matcher](#foreground-command-level-matcher)
- [Foreground: Self-Rendered Panel](#foreground-self-rendered-panel)
- [Background: Clipboard Listener](#background-clipboard-listener)
- [Background: OCR Backfill](#background-ocr-backfill)
- [KV: Settings Store](#kv-settings-store)
- [I/O: Save Clip to Disk](#io-save-clip-to-disk)
- [I/O: Copy File Clip to Another Directory](#io-copy-file-clip-to-another-directory)
- [Panel: Dynamic Resize](#panel-dynamic-resize)
- [Meta: Logging with Script Identity](#meta-logging-with-script-identity)
- [Error Handling: Graceful Degradation](#error-handling-graceful-degradation)

---

## Foreground: Menu Command with Clipboard Action

The most common pattern — read a clip, transform it, and put the result
back on the clipboard.

```ts
// ==UserScript==
// @name         Copy as Uppercase
// @version      1.0.0
// @run-at       foreground
// @match-clip   text
// @grant        globalNativeApi.registerMenuCommand
// @grant        globalNativeApi.getClipBody
// @grant        globalNativeApi.toast
// @grant        utools.copyText
// ==/UserScript==

globalNativeApi.registerMenuCommand(
  "Copy as Uppercase",
  async (ctx) => {
    const ref = ctx.clips[0];
    if (!ref || ref.type !== "text") return;
    const body = await globalNativeApi.getClipBody(ref);
    if (body?.type !== "text" || !body.text) return;

    utools.copyText(body.text.toUpperCase());
    await globalNativeApi.toast({ body: "Copied as uppercase" });
  },
);
```

**Key points:**
- Always guard `ctx.clips[0]` — it can be `undefined`.
- Always narrow `body.type` even after checking `ref.type`.
- `utools.copyText` needs its own `@grant` line.

---

## Foreground: Command-Level Matcher

Filter menu visibility beyond `@match-clip` using a synchronous predicate.

```ts
// @grant globalNativeApi.registerMenuCommand
// @grant globalNativeApi.getClipBody

globalNativeApi.registerMenuCommand(
  "Open URL in Browser",
  async (ctx) => {
    const ref = ctx.clips[0];
    if (!ref) return;
    const body = await globalNativeApi.getClipBody(ref);
    if (body?.type !== "text" || !body.text) return;

    utools.shellOpenExternal(body.text.trim());
  },
  {
    matcher: (ctx) => {
      // Only show this command when exactly one URL-shaped text clip is selected.
      if (ctx.clips.length !== 1) return false;
      const c = ctx.clips[0];
      if (c.type !== "text") return false;
      const text = ctx.bodies.get(c.hash)?.text ?? "";
      return /^https?:\/\//i.test(text);
    },
  },
);
```

**Key points:**
- `ctx.bodies` is a `Map<string, ClipTextBody | ClipFileBody>` — keyed by
  `clip.hash`.
- Matcher runs synchronously — no `await`, no external variables.
- The host serializes the matcher source and rebuilds it in host scope.

---

## Foreground: Self-Rendered Panel

Open a floating iframe panel to show rich content.

```ts
// @require https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js#sha256-…
// @grant globalNativeApi.registerMenuCommand
// @grant globalNativeApi.getClipBody
// @grant globalNativeApi.showPanel
// @grant globalNativeApi.closePanel

globalNativeApi.registerMenuCommand(
  "Show QR Code",
  async (ctx) => {
    const ref = ctx.clips[0];
    if (ref?.type !== "text") return;
    const body = await globalNativeApi.getClipBody(ref);
    if (body?.type !== "text" || !body.text) return;

    // Render inside the script's own iframe body.
    const dataUrl = await QRCode.toDataURL(body.text, {
      width: 256,
      margin: 2,
    });

    document.body.style.cssText =
      "margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff";
    document.body.innerHTML = `<img src="${dataUrl}" alt="QR" />`;

    await globalNativeApi.showPanel({
      width: 288,
      height: "auto",
      placement: "center",
    });
  },
);
```

**Key points:**
- The script's `document.body` is the panel content — style it directly.
- `height: "auto"` makes the panel fit the body content height.
- Panel state (DOM, variables) survives `closePanel` / `showPanel` cycles.
- Use `@require` for third-party libraries; always pin with SRI hash.

---

## Background: Clipboard Listener

React to new clipboard content in the background.

```ts
// ==UserScript==
// @name         Clip Counter
// @version      1.0.0
// @run-at       background
// @grant        globalNativeApi.addClipboardListener
// @grant        globalNativeApi.getClipBody
// @grant        globalNativeApi.toast
// @grant        globalNativeApi.setValue
// @grant        globalNativeApi.getValue
// ==/UserScript==

(async () => {
  let count = (await globalNativeApi.getValue<number>("clipCount")) ?? 0;

  globalNativeApi.addClipboardListener("added", async (e) => {
    count++;
    await globalNativeApi.setValue("clipCount", count);

    const body = await globalNativeApi.getClipBody(e);
    const preview =
      body?.type === "text"
        ? (body.preview ?? body.text?.slice(0, 60) ?? "")
        : body?.type === "image"
          ? `[image ${body.mime ?? "?"}]`
          : `[${e.type}]`;

    await globalNativeApi.toast({
      title: `Clip #${count}`,
      body: preview || "(empty)",
      timeoutMs: 2500,
    });
  });

  console.log(`Clip Counter started. Previous count: ${count}`);
})();
```

**Key points:**
- Use `background` run-at for always-on listeners.
- KV storage persists across restarts — good for counters.
- Wrap in IIFE (`(async () => { ... })()`) for top-level await.
- Be mindful of rate — clipboard can fire rapidly; debounce if needed.

---

## Background: OCR Backfill

Run OCR on every new image clip and store the result for search.

```ts
// ==UserScript==
// @name         OCR Backfill
// @version      1.0.0
// @run-at       background
// @match-clip   image
// @grant        globalNativeApi.addClipboardListener
// @grant        globalNativeApi.getClipBody
// @grant        globalNativeApi.setClipOcrText
// ==/UserScript==

globalNativeApi.addClipboardListener("image", async (e) => {
  const body = await globalNativeApi.getClipBody(e);
  if (body?.type !== "image" || !body.bytes) return;

  try {
    // Replace with your actual OCR call.
    const text = await yourOcrFunction(body.bytes, body.mime);
    if (text) {
      await globalNativeApi.setClipOcrText(e.hash, text);
      console.log("ocr ok", e.hash, `len=${text.length}`);
    } else {
      // Record negative result to suppress re-runs.
      await globalNativeApi.setClipOcrText(e.hash, "");
    }
  } catch (err) {
    console.error("ocr failed", e.hash, err);
    // Don't rethrow — let the listener stay alive.
  }
});
```

**Key points:**
- `setClipOcrText` writes to the shared `ocr/{hash}` store — visible to
  the built-in image text search and all other scripts.
- Pass empty string to record "no text found" (prevents repeated OCR).
- The `hash` is content-addressed — identical images share one OCR record.
- Always wrap in try/catch to prevent an unhandled error from killing
  the listener loop.

---

## KV: Settings Store

Persist user settings across script reloads.

```ts
// @grant globalNativeApi.setValue
// @grant globalNativeApi.getValue
// @grant globalNativeApi.deleteValue
// @grant globalNativeApi.listValues

interface MySettings {
  autoCopy: boolean;
  maxPreviewLen: number;
}

const DEFAULT: MySettings = { autoCopy: true, maxPreviewLen: 200 };

async function loadSettings(): Promise<MySettings> {
  const saved = await globalNativeApi.getValue<Partial<MySettings>>("settings");
  return { ...DEFAULT, ...saved };
}

async function saveSettings(patch: Partial<MySettings>): Promise<void> {
  const current = await loadSettings();
  await globalNativeApi.setValue("settings", { ...current, ...patch });
}

// Usage:
const s = await loadSettings();
console.log("maxPreviewLen:", s.maxPreviewLen);
await saveSettings({ autoCopy: false });
```

**Key points:**
- Merge with defaults on load — handles new fields added in updates.
- Use typed interfaces for settings shape.
- `getValue` returns `undefined` for unset keys — provide defaults.

---

## I/O: Save Clip to Disk

```ts
// @grant globalNativeApi.registerMenuCommand
// @grant globalNativeApi.getClipBody
// @grant globalNativeApi.saveFile
// @grant globalNativeApi.toast

globalNativeApi.registerMenuCommand(
  "Save Image as PNG",
  async (ctx) => {
    const ref = ctx.clips[0];
    if (ref?.type !== "image") return;
    const body = await globalNativeApi.getClipBody(ref);
    if (body?.type !== "image" || !body.bytes) return;

    await globalNativeApi.saveFile(body.bytes, {
      filename: `clip-${ref.hash.slice(0, 8)}.png`,
      mime: body.mime ?? "image/png",
    });
    await globalNativeApi.toast({ body: "Saved!" });
  },
);
```

For writing directly to a known directory:

```ts
await globalNativeApi.saveFile(body.bytes, {
  filename: `clip-${ref.hash.slice(0, 8)}.png`,
  mime: "image/png",
  targetDir: "/Users/me/Desktop/screenshots",
});
```

---

## I/O: Copy File Clip to Another Directory

```ts
// @grant globalNativeApi.registerMenuCommand
// @grant globalNativeApi.getClipBody
// @grant globalNativeApi.copyLocalFile
// @grant globalNativeApi.toast

globalNativeApi.registerMenuCommand(
  "Copy to Archive",
  async (ctx) => {
    const ref = ctx.clips[0];
    if (ref?.type !== "file") return;
    const body = await globalNativeApi.getClipBody(ref);
    if (body?.type !== "file" || !body.files) return;

    const archiveDir = "/Users/me/Archive/clips";

    for (const f of body.files) {
      const dest = `${archiveDir}/${f.name}`;
      await globalNativeApi.copyLocalFile(f.path, dest);
    }

    await globalNativeApi.toast({
      body: `Copied ${body.files.length} file(s) to Archive`,
    });
  },
);
```

---

## Panel: Dynamic Resize

Adjust panel size after content loads.

```ts
// @grant globalNativeApi.showPanel
// @grant globalNativeApi.resizePanel

async function showDynamicPanel(content: string) {
  document.body.innerHTML = `<pre>${content}</pre>`;
  await globalNativeApi.showPanel({ width: 320, height: 200, placement: "center" });

  // After content renders, snap to content height.
  requestAnimationFrame(() => {
    const h = document.body.scrollHeight;
    globalNativeApi.resizePanel({ height: Math.min(h, 600) }); // cap at 600px
  });
}
```

**Key points:**
- Use `requestAnimationFrame` to wait for layout after DOM changes.
- Cap dimensions to prevent oversized panels.

---

## Meta: Logging with Script Identity

Use `globalNativeApi.info` to prefix log output.

```ts
const { name, version } = globalNativeApi.info;
const PREFIX = `[${name} v${version}]`;

console.log(`${PREFIX} started`);
console.warn(`${PREFIX} something looks off`);
```

The host also auto-prefixes `console.*` output with `[script:<name>]`, but
adding your own prefix helps when multiple scripts log simultaneously.

---

## Error Handling: Graceful Degradation

Don't let errors crash your script — catch and report.

```ts
globalNativeApi.registerMenuCommand(
  "Risky Operation",
  async (ctx) => {
    try {
      const ref = ctx.clips[0];
      if (!ref) return;

      // ... your logic ...

    } catch (err) {
      console.error("command failed", err);
      await globalNativeApi.toast({
        title: "Error",
        body: err instanceof Error ? err.message : String(err),
        timeoutMs: 5000,
      });
      // Don't rethrow — let the command complete gracefully.
    }
  },
);
```

For clipboard listeners, use `console.error` (don't show toast for every
failure — it could spam the user):

```ts
globalNativeApi.addClipboardListener("image", async (e) => {
  try {
    // ... processing ...
  } catch (err) {
    console.error("listener failed", e.hash, err);
  }
});
```
