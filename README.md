# @super-clipboard/userscript-types

> English ｜ [简体中文](./README.zh-CN.md)

TypeScript type definitions for [SuperClipboard](https://github.com/super-clipboard) user-script developers.

Provides type declarations for the `GM_*` API surface — covering the Tampermonkey-compatible subset implemented by SuperClipboard, plus SuperClipboard-specific clipboard / popover / metadata APIs.

## Install

```bash
pnpm add -D @super-clipboard/userscript-types
# Optional: install the upstream Tampermonkey types as a reference
pnpm add -D @types/tampermonkey
```

## Enable

Option 1 — triple-slash reference:

```ts
/// <reference types="@super-clipboard/userscript-types" />

GM_registerMenuCommand("Hi", async (ctx) => {
  await GM_setClipboard("hello");
});
```

Option 2 — `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["@super-clipboard/userscript-types"]
  }
}
```

## Relationship to Tampermonkey

- API names match Tampermonkey (`GM_xmlhttpRequest`, `GM_setValue`, …) so existing user-script developers feel at home.
- **Behaviour follows this package's types** when they diverge — for example `GM_xmlhttpRequest` returns `Promise<XhrResponse>` and only allows hosts in the `@connect` allow-list.
- SuperClipboard-only APIs use prefixes such as `GM_addClipboardListener`, `GM_setClipMetadata`, `GM_showPopover`.

See `docs/arch-plan/18-custom-actions-api.md` in the main repo for the full design.

## License

MIT
