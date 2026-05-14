# @super-clipboard/userscript-types

> English ｜ [简体中文](./README.zh-CN.md)

TypeScript type definitions for [SuperClipboard](https://github.com/super-clipboard) user-script developers.

This package ships a single global, **`globalNativeApi`**, that lets a user
script subscribe to clipboard events, read clip bodies, register context-menu
commands, persist key/value data, and mount popover panels — all without
touching the host application's internals.

## Install

```bash
pnpm add -D @super-clipboard/userscript-types
```

The package has no runtime — only `.d.ts` files.

## Enable

**Option 1 — triple-slash reference at the top of your script:**

```ts
/// <reference types="@super-clipboard/userscript-types" />

const id = globalNativeApi.registerMenuCommand("Copy as link", async (ctx) => {
  const target = ctx.clips[0];
  if (target?.type !== "text") return;
  const body = await globalNativeApi.getClipBody(target);
  if (body?.type === "text" && body.text) {
    utools.copyText(`<${body.text}>`);
  }
});
```

**Option 2 — `tsconfig.json`:**

```json
{
  "compilerOptions": {
    "types": ["@super-clipboard/userscript-types"]
  }
}
```

Both styles inject `globalNativeApi` and the `SuperClipboard` namespace into
the global scope. They also pull in
[`utools-api-types`](https://www.npmjs.com/package/utools-api-types) so that
`utools.*` is available for free.

## API surface at a glance

```ts
// Subscribe to clipboard events
globalNativeApi.addClipboardListener("added", (e) => {
  globalNativeApi.log("captured", e.type, e.hash);
});

// Read clip bodies (tagged union by `type`)
const body = await globalNativeApi.getClipBody(ref);
if (body?.type === "image") console.log(body.bytes?.byteLength);

// Persistent KV storage scoped to your script
await globalNativeApi.setValue("count", 1);
const count = await globalNativeApi.getValue<number>("count");

// Notifications & file save
await globalNativeApi.notification({ title: "Done", body: "Synced." });
await globalNativeApi.saveFile({ filename: "clip.txt", content: body.text! });

// Mount an HTML panel (anchored / centered / docked)
await globalNativeApi.showPanel({ url: "panel.html", placement: "right" });
```

The complete signatures live in
[`spec.d.ts`](./spec.d.ts) under the `SuperClipboard` namespace, with JSDoc
and `@example` blocks for every method.

## Subpath: typed host contracts

Hosts (or anything that wants the spec without the global injection) can
import the namespace as a normal module:

```ts
import type { SuperClipboard } from "@super-clipboard/userscript-types/spec";

const api: SuperClipboard.GlobalNativeApi = {
  /* … */
};
```

This is exactly how the SuperClipboard host implements its sandbox bridge —
any signature change in `spec.d.ts` becomes a compile-time error in the host
implementation.

## Versioning

- This package follows [SemVer](https://semver.org/).
- Breaking signature changes (renames, removed methods, narrowed return
  types) bump the **minor** version while the API is pre-1.0; they will bump
  the **major** version once 1.0 is reached.
- Doc-only edits and additive optional fields ship as patch releases.

## License

MIT
