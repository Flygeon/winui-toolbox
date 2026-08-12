# WinUI Toolbox · WinUI 工具箱

> 原生体验、完全本地优先的 Windows 多功能工具箱。
> 基于 **Tauri 2** + **Vue 3** + **TypeScript** + **WinUIonWeb** 组件库。

所有数据处理（编码解码、哈希、加解密、脱敏、转换）均在本地完成，不上传、不联网，核心功能离线可用。

---

## ✨ 特性

- **原生 WinUI 观感**：通过 [WinUIonWeb](https://furry-xiyi.github.io/WinUIonWeb/) 组件库复刻 Windows 11 设计语言（圆角、亚克力、动效）。
- **自定义标题栏**：无边框窗口 + 自绘最小化 / 最大化 / 关闭按钮，支持拖拽与双击最大化。
- **主页**：WinUI 风格落地页，含工具搜索、最近使用、我的收藏、模块分类卡片。
- **主题切换**：浅色 / 深色 / 跟随系统，设置持久化。
- **可折叠侧边栏**：按「开发者工具 / 办公与文档 / 多媒体 / 系统与效率」四模块分组导航，可「始终展开」。
- **轻量高效**：Tauri 2 + 系统 WebView2，安装包小、启动快、内存占用低。
- **离线可用**：核心工具 100% 本地运行，无任何网络依赖。

## 🗂️ 当前进度（第一阶段 + 第二阶段已全部交付）

| 模块 | 工具 | 状态 |
| --- | --- | --- |
| 开发者工具 | 时间戳转换、编码/解码、JSON 格式化、哈希/加解密（含文件哈希）、二维码（生成+解析）、UUID/随机密码、JWT 调试、正则测试（含替换）、Cron 表达式、IP/网络工具 | ✅ 已完成 |
| 办公与文档 | 文本处理、敏感信息脱敏、文本比对 Diff、Markdown 编辑器（实时预览+导出 HTML/Word/PDF）、Markdown 转 Word/PDF、表格数据转换（CSV/JSON/Markdown）、PDF 工具集（合并/拆分/旋转/加密/解密） | ✅ 已完成 |
| 系统与效率 | 番茄钟 / 白噪音 | ✅ 已完成 |
| 多媒体 | 图片/音视频转换、图标生成、GIF、OCR、截图录屏等 | 🚧 规划中（第三阶段） |
| 系统与效率 | 硬件监控、系统清理、剪贴板历史、端口查询、局域网快传等 | 🚧 规划中（第四阶段） |

**已实现的增强能力**：主页（搜索/最近/收藏/模块卡片）、工具收藏 ⭐、窗口尺寸与位置记忆、侧边栏「始终展开」开关。

> 「规划中」的工具已在侧边栏占位，选择后展示规划功能说明，逐步填充。

## 🛠️ 技术栈

| 层 | 技术 |
| --- | --- |
| 桌面壳 | [Tauri 2](https://tauri.app/)（Rust） |
| 前端 | Vue 3 · TypeScript · Vite · Pinia · Vue Router |
| UI | [WinUIonWeb](https://furry-xiyi.github.io/WinUIonWeb/)（源码方式引入，见 `src/winui/`） |
| 持久化 | `tauri-plugin-store`（主题、侧边栏、历史） |
| 工具库 | `crypto-js`（哈希/加解密）、`qrcode` + `jsqr`（二维码）、`cron-parser`、`marked` + `docx`（Markdown/文档）、`pdf-lib`（PDF）、`marked`（Markdown 渲染） |

## 📁 目录结构

```
.
├── src/                  # 前端
│   ├── winui/            # WinUIonWeb 组件库（vendored，含 i18n / theme.css / 字体）
│   ├── components/       # 应用通用组件（窗口控制、主题按钮、复制按钮…）
│   ├── tools/            # 各工具实现 + registry（工具注册表）
│   │   ├── registry.ts   # 模块与工具定义（id / 标题 / 图标 / 状态 / 懒加载组件）
│   │   ├── timestamp/    # 已实现的 11 个工具，每个一个目录
│   │   └── …
│   ├── stores/           # Pinia（settings：主题 + 侧边栏）
│   ├── views/            # ToolView / SettingsView
│   ├── router/           # vue-router（hash 模式）
│   └── utils/            # 剪贴板、diff、窗口控制
├── src-tauri/            # Tauri 2 Rust 壳
│   ├── src/{main,lib}.rs
│   ├── tauri.conf.json   # productName=WinUI Toolbox, identifier=cn.winui.toolbox
│   └── capabilities/     # 窗口拖拽/最小化/最大化/关闭 权限
└── .github/workflows/    # GitHub Actions 构建
```

**新增一个工具**：在 `src/tools/<id>/index.vue` 写页面，然后在 `src/tools/registry.ts` 的对应模块下加一行 `ready(...)` 即可自动出现在侧边栏与路由中。

## 🚀 本地开发

```bash
npm install
npm run tauri dev      # 启动开发窗口（需本机具备 Tauri 编译环境）
```

前端独立预览：

```bash
npm run dev            # http://localhost:1420
```

构建（前端类型检查 + 打包）：

```bash
npm run build
npx tauri build --bundles nsis,msi
```

## 🤖 持续集成（GitHub Actions）

由于本机没有完整的 Windows 编译环境（缺少 MSVC 链接器），请将本仓库推送到 GitHub，
由 `.github/workflows/build.yml` 在 `windows-latest` 上完成构建：

- 每次 push 到 `main` / 提交 PR → 构建并上传 **NSIS 安装包（.exe）与 MSI（.msi）** 为 Actions 工件；
- 打标签 `v*` → 自动发布到 GitHub Release，附带安装包与更新说明。

流程要点（参考同使用 Tauri 2 的 [LumiLuna](https://github.com/LumiLuna/) 项目）：
`actions/setup-node`（Node 20）→ `dtolnay/rust-toolchain@stable` → `swatinem/rust-cache@v2` → `npm ci` → `tauri build`。
`Cargo.lock` 与 `package-lock.json` 均已提交，保证 CI 构建可复现。

> 首次构建约需 15–20 分钟（下载并编译 Rust 依赖），之后的构建由缓存加速。

## 📌 说明

- `WinUIonWeb模板/` 为参考用的 WinUIonWeb 源码模板；组件已复制进 `src/winui/`，该目录仅作参考，可安全删除。
- 应用图标目前沿用了模板默认图标，可用 `npx tauri icon <你的1024px图片>` 一键替换。
- 本项目的 Windows 原生交互（拖拽、窗口按钮、双击最大化）通过 `data-tauri-drag-region` 与 `@tauri-apps/api/window` 实现，见 `src/App.vue` 与 `src/components/WindowControls.vue`。

## 📄 许可

本项目遵循 [计划书](计划书.md) 中的设计；WinUIonWeb 组件库部分遵循其各自 LICENSE。
