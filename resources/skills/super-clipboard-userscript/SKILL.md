---
name: super-clipboard-userscript
description: >
  Write, review, or debug SuperClipboard userscripts. Use whenever the user
  mentions "userscript", "user script", "super-clipboard script",
  "globalNativeApi", "clipboard script", "@grant", "@match-clip",
  "@run-at", "registerMenuCommand", "addClipboardListener", or wants to
  create/extend/troubleshoot a SuperClipboard automation script. Also triggers
  when asked about clipboard automation, custom menu commands, background
  clipboard processing, OCR integration, or panel-based UIs inside
  SuperClipboard.
---

# SuperClipboard UserScript Skill

Guide for writing SuperClipboard userscripts — self-contained JavaScript
automations that run inside the SuperClipboard host. Scripts can react to
clipboard events, register context-menu commands, mount HTML panels, persist
KV data, and access the file system.

## When to Use This Skill

- Creating a new SuperClipboard userscript from scratch
- Adding a menu command, clipboard listener, or panel to an existing script
- Debugging `globalNativeApi.*` calls, grant errors, or sandbox issues
- Reviewing script metadata headers (`==UserScript==`)
- Understanding the type system (`ClipRef`, `ClipKind`, etc.)
- Migrating from deprecated APIs (`notification` → `toast`, etc.)

## Quick Orientation

A SuperClipboard userscript is a single `.user.js` file with:

1. **Metadata header** (`==UserScript==` block) — declares name, grants,
   match-clip filter, run-at mode, and optional `@require` deps.
2. **Script body** — plain JavaScript/TypeScript running in a sandboxed
   iframe with two injected globals:
   - `globalNativeApi` — project-specific surface (clipboard, KV, panel, I/O).
   - `utools` — a denylisted subset of the uTools API (copy, shell, etc.).

```ts
// ==UserScript==
// @name         My Script
// @version      1.0.0
// @run-at       foreground
// @match-clip   text,image
// @grant        globalNativeApi.toast
// @grant        globalNativeApi.getClipBody
// @grant        globalNativeApi.registerMenuCommand
// ==/UserScript==

globalNativeApi.registerMenuCommand(
  "Say Hello",
  async (ctx) => {
    const ref = ctx.clips[0];
    if (!ref) return;
    await globalNativeApi.toast({ body: `Hello from ${ref.type}` });
  },
);
```

## API Categories

| Category | Key Methods | When to Use |
|----------|------------|-------------|
| **Menu** | `registerMenuCommand`, `unregisterMenuCommand` | Adding right-click actions on clips |
| **Events** | `addClipboardListener`, `removeClipboardListener` | Reacting to new clipboard content |
| **Data** | `getClipBody`, `setClipOcrText` | Reading/writing clip content & OCR text |
| **KV** | `setValue`, `getValue`, `deleteValue`, `listValues` | Per-script persistent storage |
| **I/O** | `toast`, `saveFile`, `copyLocalFile` | User feedback & file operations |
| **Panel** | `showPanel`, `resizePanel`, `closePanel` | Custom iframe-based UIs |
| **Meta** | `info` | Script identity (name, version, grants) |

## Reference Files

Read these files on-demand based on what the user needs. The main SKILL.md
stays focused on workflow guidance; detailed specs live in `reference/`.

| File | Contents | Read When |
|------|----------|-----------|
| [quickstart.md](reference/quickstart.md) | Step-by-step script creation with code examples | User wants to create their first script or learn by example |
| [api-reference.md](reference/api-reference.md) | Every `globalNativeApi` method with signatures, JSDoc, and examples | User asks about a specific API method or needs full details |
| [meta-headers.md](reference/meta-headers.md) | Complete `==UserScript==` header specification | User needs to configure grants, match-clip, run-at, or @require |
| [types.md](reference/types.md) | TypeScript interface definitions (`ClipRef`, `ClipBodyContent`, etc.) | User needs type info for body switching, event payloads, or callback contexts |
| [patterns.md](reference/patterns.md) | Common recipes: menu commands, listeners, panels, KV, file I/O | User knows what they want but needs the idiomatic pattern |

## Key Conventions

### Grants

Every API method requires an explicit `@grant` line. Use fine-grained grants:

```ts
// @grant globalNativeApi.toast        ← specific, preferred
// @grant globalNativeApi.getClipBody
```

The wildcard `globalNativeApi.*` works but is subject to a host-enforced
denylist. Unknown grants are silently ignored (no load error), but calling
an ungranted method at runtime throws `GRANT_DENIED`.

### Clipboard Event Channels

Four channels, from coarse to fine-grained:

- `"added"` — any type, fires for every clip
- `"text"` — text clips only
- `"image"` — image clips only
- `"file"` — file clips only

Prefer type-specific channels over filtering inside an `"added"` handler.

### Body Tagged Union

`getClipBody` returns a tagged union — always branch on `body.type`:

```ts
const body = await globalNativeApi.getClipBody(ref);
if (!body) return; // clip cleaned up
switch (body.type) {
  case "text":  /* body.text, body.preview */ break;
  case "image": /* body.bytes, body.mime */  break;
  case "file":  /* body.files */             break;
}
```

### Run-at Modes

- `foreground` — `registerMenuCommand` available; runs when plugin window opens.
- `background` — no menu commands; runs on startup and stays resident.
  Use for clipboard listeners, periodic tasks, or background OCR.

### Type Setup

For TypeScript support, add to your script or tsconfig:

```json
{ "compilerOptions": { "types": ["@super-clipboard/userscript-types"] } }
```

Or at the top of a `.ts` script:

```ts
/// <reference types="@super-clipboard/userscript-types" />
```

## Gotchas

- **Menu command IDs don't persist** — re-register on every launch.
- **Panel state survives close/show** — the iframe is not rebuilt; use
  `addPanelListener("closed")` to react (if available).
- **`@namespace` is not the isolation key** — script identity is derived
  from the frozen install-source URL hash, not `@namespace`.
- **`console.*` is intercepted** — all `console.log/warn/error` calls are
  forwarded to the host's debug log panel with a `[script:<name>]` prefix.
  Prefer `console.*` over the removed `globalNativeApi.log/warn/error`.
- **`matcher` must be synchronous** — no `async`/`await`, no closure
  variables outside `ctx`. The host serializes the function source and
  rebuilds it in host scope.
- **`ClipRef` is a pointer, not body** — always call `getClipBody(ref)` to
  get the actual content; `ClipRef` only carries `hash` and `type`.
