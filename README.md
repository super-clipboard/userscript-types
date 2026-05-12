# @super-clipboard/userscript-types

> TypeScript 类型定义包，面向 SuperClipboard 自定义脚本开发者。

提供 `GM_*` API 的类型声明，覆盖 SuperClipboard 实现的全部 Tampermonkey 兼容 API
子集，并补充 SuperClipboard 独有的剪贴板 / Popover / 元数据相关 API。

## 安装

```bash
pnpm add -D @super-clipboard/userscript-types
# 同时建议安装 Tampermonkey 类型作为对照（可选）
pnpm add -D @types/tampermonkey
```

## 启用

方式 1 — 三斜线引用：

```ts
/// <reference types="@super-clipboard/userscript-types" />

GM_registerMenuCommand("Hi", async (ctx) => {
  await GM_setClipboard("hello");
});
```

方式 2 — `tsconfig.json`：

```json
{
  "compilerOptions": {
    "types": ["@super-clipboard/userscript-types"]
  }
}
```

## 与 Tampermonkey 的关系

- API 命名一致（`GM_xmlhttpRequest`、`GM_setValue` 等），便于熟悉 Tampermonkey 的开发者上手
- **API 行为以本包类型为准**，例如 `GM_xmlhttpRequest` 返回 `Promise<XhrResponse>`，且仅放行 `@connect` 白名单中的域名
- SuperClipboard 独有 API 以 `GM_addClipboardListener` / `GM_setClipMetadata` / `GM_showPopover` 等命名

详见仓库 `docs/arch-plan/18-custom-actions-api.md`。
