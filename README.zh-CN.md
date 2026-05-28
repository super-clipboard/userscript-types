# @super-clipboard/userscript-types

> [English](./README.md) ｜ 简体中文

面向 [SuperClipboard](https://github.com/super-clipboard) 自定义脚本开发者的
TypeScript 类型定义包。

本包对外暴露唯一的全局对象 **`globalNativeApi`**：脚本通过它订阅剪贴板事件、
读取剪贴项内容、注册右键菜单命令、读写持久化数据、挂载弹窗面板等 ——
完全无需触碰宿主应用内部。

## 安装

```bash
pnpm add -D @super-clipboard/userscript-types
```

本包不含运行时，仅有 `.d.ts` 文件。

## 启用

**方式 1 —— 在脚本顶部使用三斜线引用：**

```ts
/// <reference types="@super-clipboard/userscript-types" />

const id = globalNativeApi.registerMenuCommand("复制为链接", async (ctx) => {
  const target = ctx.clips[0];
  if (target?.type !== "text") return;
  const body = await globalNativeApi.getClipBody(target);
  if (body?.type === "text" && body.text) {
    utools.copyText(`<${body.text}>`);
  }
});
```

**方式 2 —— `tsconfig.json`：**

```json
{
  "compilerOptions": {
    "types": ["@super-clipboard/userscript-types"]
  }
}
```

两种方式都会将 `globalNativeApi` 与 `SuperClipboard` 命名空间注入到全局作用
域，并顺带引入
[`utools-api-types`](https://www.npmjs.com/package/utools-api-types) ——
所以 `utools.*` 也可以直接使用。

## API 一览

```ts
// 订阅剪贴板事件
globalNativeApi.addClipboardListener("added", (e) => {
  console.log("captured", e.type, e.hash);
});

// 读取剪贴项正文（按 `type` 区分的标签联合）
const body = await globalNativeApi.getClipBody(ref);
if (body?.type === "image") console.log(body.bytes?.byteLength);

// 脚本作用域内的持久化 KV
await globalNativeApi.setValue("count", 1);
const count = await globalNativeApi.getValue<number>("count");

// 通知与文件保存
await globalNativeApi.notification({ title: "完成", body: "已同步" });
await globalNativeApi.saveFile({ filename: "clip.txt", content: body.text! });

// 挂载 HTML 面板（锚定 / 居中 / 停靠）
await globalNativeApi.showPanel({ url: "panel.html", placement: "right" });
```

完整方法签名见 [`spec.d.ts`](./spec.d.ts) 中的 `SuperClipboard` 命名空间，
每个方法都附带 JSDoc 与 `@example` 代码片段。

## 子路径：宿主侧类型契约

宿主（或任何只需要类型而不希望注入全局变量的代码）可以把命名空间当成
普通模块来 import：

```ts
import type { SuperClipboard } from "@super-clipboard/userscript-types/spec";

const api: SuperClipboard.GlobalNativeApi = {
  /* … */
};
```

SuperClipboard 宿主自身就是这样实现 sandbox bridge 的 ——
`spec.d.ts` 里任何签名变化都会在宿主实现中变成编译错误。

## 版本约定

- 本包遵循 [SemVer](https://semver.org/)
- 在到达 1.0 之前，破坏性签名变更（重命名、删除方法、收紧返回类型等）
  会升 **次版本号**；到达 1.0 后会升 **主版本号**
- 仅文档调整与新增可选字段以补丁号发布

## License

MIT
