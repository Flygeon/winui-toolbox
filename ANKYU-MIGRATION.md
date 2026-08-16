# AWMC → WinUI Toolbox 功能移植方案（v2 · 去 ankyu 版）

> 来源：朋友的 AWMC 项目策划（`ANKYU-PLAN.md` v0.2 + `ANKYU-PACKAGING.md`）
> 目标项目：WinUI Toolbox（`计划书.md` / `README.md`）
> 编制日期：2026-08-17
> v2 变更：**移除 `.ankyu` 扩展机制**（扩展框架/依赖状态机/扩展管理 UI/外部编码器 ankyu/blocks 全部不移植）；构建保留原 GitHub Actions 并**新增 CNB 工作流（并存）**；UI 统一使用 WinUIonWeb。

---

## 0. 两项目对照速览

| 维度 | AWMC（朋友项目） | WinUI Toolbox（本项目） | 是否契合 |
|---|---|---|---|
| 定位 | 图片处理瑞士军刀（复刻 ImageToolbox） | Windows 通用工具箱（开发/办公/多媒体/系统） | 定位不同，**部分功能可移植** |
| 桌面框架 | Tauri 2 + Rust | Tauri 2 + Rust | ✅ 完全一致 |
| 前端 | Svelte 5 + mdui v2（Material 3） | Vue 3 + WinUIonWeb（Windows 11 风格） | ❌ 组件体系完全不同 |
| UI 风格 | Material Design 3 | WinUI 3 / Windows 11 | ❌ 不可直接照搬视觉 |
| 扩展机制 | `.ankyu` 7z 包 | **不移植**（保持静态 `registry.ts`） | ❌ 舍弃 |
| Rust 依赖 | `image` / 编码器 | `sysinfo` / `winreg` / FFmpeg 外置 | 需补充 |
| 已有工具 | 60+ 图像工具 | 25+ 通用工具 | 互补 |

**核心结论**：仅移植 AWMC 的 **图像处理能力矩阵**（纯算法部分）。`.ankyu` 扩展机制、Material 3 UI、Svelte 技术栈、AI/文档扫描等全部舍弃。

---

## 1. 可复用核心功能模块识别

### 1.1 直接可移植（纯算法/逻辑，与 UI 无关）

| AWMC 模块 | 对应本项目位置 | 复用方式 |
|---|---|---|
| 格式转码矩阵（§4.4 内置部分） | `src/tools/image/`、`src/tools/compress/` | Rust 端用 `image` crate 重写，替换现有 Canvas 方案 |
| 图像变换（裁剪/旋转/翻转/缩放/限尺寸/按体积缩放） | 新增工具或增强 `image` | 纯算法，Rust 实现 |
| 滤镜（纯算法 100+，JH Labs 系） | 新增"图片滤镜"工具 | Rust `imageproc` 实现 |
| 曲线调整 | 新增工具 | 纯算法 |
| 图像对比（SSIM/PSNR 等 6 算法） | 新增工具 | 纯算法 |
| 重复查找（pHash） | 新增工具 | 纯算法 |
| ASCII / 噪点 / 纹理 / 渐变 / 网格渐变生成 | 新增"图像创作"分组 | 纯算法 |
| 拼贴 / 马赛克 / 水印 / 分割 / 拼接 / 堆栈 | 新增工具 | 纯算法 |
| EXIF 查看/删除/编辑 | 新增工具（`kamadak-exif`） | Rust 实现 |
| 二维码（已有 `qrcode`+`jsqr`） | 已有，无需移植 | — |
| Base64/加密/校验和（已有 `crypto-js`） | 已有，可考虑迁移到 Rust 提升大文件性能 | 可选 |

### 1.2 需改造后移植

| AWMC 模块 | 改造点 |
|---|---|
| 图像处理从 Canvas 迁移到 Rust | `Cargo.toml` 加 `image`/`imageproc`/`kamadak-exif`；前端 `utils/image.ts` 改为 invoke 封装 + Canvas 降级 |
| 编码器策略 | 内置格式（PNG/JPEG/WebP/BMP/TIFF/GIF/QOI/ICO）编译进核心；高级优化器（OxiPNG/ImageQuant）按需编译；外部编码器（libjxl/libheif/ravif/openjpeg）**不移植**（舍弃 ankyu 后无分发载体，后续如需可走独立工具页） |
| CNB 构建工作流 | 与现有 GitHub Actions 并存；镜像择优下载 FFmpeg（供构建期测试）|

### 1.3 舍弃（与本项目定位不符或已决定不移植）

| AWMC 模块 | 舍弃原因 |
|---|---|
| `.ankyu` 扩展机制（§6-7 全部） | **用户决定不移植**；本项目保持静态 `registry.ts` |
| 功能依赖系统（DepState / 三态展示） | 依赖 ankyu，一并舍弃 |
| 外部编码器 ankyu（libjxl/libheif/ravif/openjpeg） | 无 ankyu 载体；如需高级格式后续单独评估 |
| blocks 屏蔽机制 | 依赖 ankyu，舍弃 |
| 扩展管理 UI | 依赖 ankyu，舍弃 |
| Material 3 UI 复刻策略（§3） | 本项目是 WinUI 风格，不可混用 |
| mdui v2 / material-symbols | 本项目用 WinUIonWeb + Segoe Fluent 字体 |
| Svelte 5 前端 | 本项目用 Vue 3 |
| 顶层 NavigationRail/BottomBar 布局 | 本项目是侧边栏 + 内容区 |
| GPUImage/G'MIC 滤镜链 | 过重，非本项目核心定位 |
| 着色器工作室（shader-studio） | 与工具箱定位不符 |
| AI ankyu（去背景/超分/OCR 模型） | 本项目 OCR 已规划，走独立方案；AI 非当前阶段 |
| 文档扫描（OpenCV） | 非本项目定位 |
| PDF 全功能（mupdf） | 本项目 PDF 用 `pdf-lib`，已满足合并/拆分/加密需求 |

---

## 2. 移植优先级与依赖关系

### 优先级定义

- **P0**：架构地基，必须先做
- **P1**：高价值、低风险、与现有架构契合
- **P2**：中等价值，需一定改造

### 2.1 优先级矩阵

| # | 功能 | 优先级 | 依赖 | 说明 |
|---|---|---|---|---|
| 1 | Rust 图像管线基础设施（`image` + `imageproc` + `kamadak-exif`） | P0 | 无 | 所有图像工具的地基 |
| 2 | 前端图像工具调用封装（替换 `utils/image.ts` 的 Canvas 方案） | P0 | #1 | 统一 invoke 通道 |
| 3 | 格式转码增强（PNG/JPEG/WebP/BMP/TIFF/GIF/QOI/ICO + OxiPNG + ImageQuant） | P1 | #1,#2 | 替换现有 Canvas 转码 |
| 4 | 图片压缩增强（OxiPNG + ImageQuant + JPEG 质量精调） | P1 | #3 | 现有 `compress` 工具升级 |
| 5 | 图像变换工具（裁剪/旋转/翻转/缩放多算法/限尺寸/按体积缩放） | P1 | #1,#2 | 新增工具 |
| 6 | 调整工具（亮度/对比度/饱和度/色相/伽马/色温） | P1 | #1,#2 | 新增工具 |
| 7 | 滤镜工具（首批 20-30 个纯算法滤镜） | P2 | #1,#2 | 新增"图片滤镜"工具 |
| 8 | 曲线调整工具 | P2 | #1,#2 | 新增工具 |
| 9 | EXIF 查看/删除/编辑工具 | P2 | #1 | 新增工具 |
| 10 | 图像对比工具（SSIM/PSNR 等） | P2 | #1,#2 | 新增工具 |
| 11 | 重复图片查找（pHash） | P2 | #1,#2 | 新增工具 |
| 12 | 创作类工具（ASCII/水印/分割/拼接/拼贴，首批 5 个） | P2 | #1,#2 | 新增"图像创作"分组 |
| 13 | CNB 构建工作流（与 GitHub Actions 并存） | P2 | 无 | 纯构建，FFmpeg 用户自备 |

### 2.2 依赖关系图

```
                    ┌─────────────────────────┐
                    │ #1 Rust 图像管线地基      │
                    └────────┬────────────────┘
                             │
                    ┌────────▼────────────────┐
                    │ #2 前端 invoke 封装       │
                    └────────┬────────────────┘
                             │
        ┌────────┬───────────┼───────────┬────────────┐
        ▼        ▼           ▼           ▼            ▼
   ┌─────┐  ┌─────┐     ┌─────┐     ┌─────┐      ┌─────┐
   │ #3  │  │ #4  │     │ #5  │     │ #6  │ ...  │ #12 │
   │转码 │  │压缩 │     │变换 │     │调整 │      │创作 │
   └─────┘  └─────┘     └─────┘     └─────┘      └─────┘

   ┌──────────────────────────────────┐
   │ #13 CNB 构建工作流（独立线）       │
   └──────────────────────────────────┘
```

---

## 3. 需要定制化改造的部分及改造说明

### 3.1 图像处理从 Canvas 迁移到 Rust

**现状**：`src/utils/image.ts` 纯前端 Canvas，仅支持 PNG/JPEG/WebP 互转与等比缩放，无 EXIF、无高级编码器、大图性能差。

**改造**：
1. `Cargo.toml` 新增：`image = "0.25"`、`imageproc = "0.25"`、`kamadak-exif = "0.6"`、`oxipng = "9"`（可选）、`imagequant = "4"`（可选）
2. `lib.rs` 新增图像命令模块 `image_ops.rs`：`image_convert`、`image_compress`、`image_transform`、`image_adjust`、`image_filter`、`exif_read`、`exif_strip`
3. 前端 `utils/image.ts` 改为 invoke 封装，保留 Canvas 方案作为非 Tauri 环境降级
4. 现有 `image`/`compress`/`icon` 工具切换到 Rust 后端

### 3.2 UI 风格

所有新增工具页统一使用 WinUIonWeb 组件库（`src/winui/components/`）+ 现有 `tb-section`/`tb-card`/`tb-row` CSS 类，与 `image`/`compress` 等已有工具保持视觉一致。不引入 mdui 或任何 Material 组件。

### 3.3 CNB 构建工作流（与 GitHub Actions 并存）

**原 GitHub Actions**（`.github/workflows/build.yml`）：保留不变，继续在 `windows-latest` 上构建 NSIS + MSI。

**新增 CNB 工作流**（`.cnb.yml`）：
- 触发：push 到 main / 打标签 v*
- 平台：Windows 构建
- 步骤：Rust stable + npm ci + 前端类型检查 + tauri build
- 产物：NSIS `.exe` + MSI `.msi`，上传为构建产物
- 与 GitHub Actions **并存**，互不影响
- **FFmpeg 不内置打包**，由用户自行下载并在设置中选择启用（与现有策略一致）

---

## 4. 实施步骤与时间规划

> 假设单人全职开发，每阶段含测试与文档。

### 阶段 A：图像处理 Rust 化（2-3 周）

| 步骤 | 内容 | 产出 |
|---|---|---|
| A1 | `Cargo.toml` 加依赖，搭建 `image_ops.rs` 模块骨架 | 编译通过 |
| A2 | 实现 `image_convert`（内置格式互转 + OxiPNG + ImageQuant） | 替换 `image` 工具后端 |
| A3 | 实现 `image_compress`（OxiPNG + ImageQuant + JPEG 质量精调，实时大小对比） | 升级 `compress` 工具 |
| A4 | 实现 `image_transform`（裁剪/旋转/翻转/缩放/限尺寸/按体积缩放） | 新增"图像变换"工具 |
| A5 | 实现 `image_adjust`（亮度/对比度/饱和度/色相/伽马/色温） | 新增"图像调整"工具 |
| A6 | 实现 `exif_read`/`exif_strip` | 新增"EXIF 工具" |
| A7 | 前端 `utils/image.ts` 重构为 invoke 封装 + 降级 | 现有工具无缝切换 |

**验收**：打开图片 → 转码/压缩/变换/调整 → 导出，全链路 Rust 后端，性能优于 Canvas。

### 阶段 B：图像工具扩展（2-3 周）

| 步骤 | 内容 | 产出 |
|---|---|---|
| B1 | 实现 `image_filter`（首批 20-30 纯算法滤镜：模糊/锐化/边缘/艺术/颜色） | 新增"图片滤镜"工具 |
| B2 | 实现 `image_compare`（SSIM/PSNR/AE/MAE/NCC/RMSE） | 新增"图像对比"工具 |
| B3 | 实现 `image_phash` + 批量扫描 | 新增"重复图片查找"工具 |
| B4 | 实现曲线调整 | 新增"曲线调整"工具 |
| B5 | 创作类工具（ASCII/水印/分割/拼接/拼贴，首批 5 个） | 新增"图像创作"分组 |

**验收**：多媒体模块工具数从 8 增至 18+，覆盖 ImageToolbox 核心纯算法功能的 40%+。

### 阶段 C：CNB 构建工作流（0.5 周）

| 步骤 | 内容 | 产出 |
|---|---|---|
| C1 | 编写 `.cnb.yml`，Windows 构建 + Node 20 + Rust stable | 基础构建链路 |
| C2 | 产物上传（NSIS + MSI） | 与 GitHub Actions 产物对齐 |

**验收**：push 到 main 后 CNB 与 GitHub Actions 均触发构建，产物一致。

> FFmpeg 不内置打包，由用户自行下载并在设置中选择启用（与现有策略一致）。

### 总时间规划

| 阶段 | 时长 | 累计 |
|---|---|---|
| A 图像 Rust 化 | 2-3 周 | 3 周 |
| B 图像工具扩展 | 2-3 周 | 6 周 |
| C CNB 构建工作流 | 0.5 周 | 6.5 周 |
| **合计** | **4.5-6.5 周** | — |

---

## 5. 风险评估与注意事项

### 5.1 技术风险

| 风险 | 等级 | 说明 | 缓解措施 |
|---|---|---|---|
| Rust 图像 crate 编译时间长 | 中 | `image`+`imageproc`+`oxipng`+`imagequant` 首次编译或增 5-10min | CI 用 `swatinem/rust-cache`；本地开发用 `cargo check` 快速迭代 |
| OxiPNG/ImageQuant 等 C 依赖跨平台编译 | 中 | Windows MSVC 链接 C 库可能出错 | 优先用纯 Rust 替代；若编译失败则降级为 `image` 自带编码器，OxiPNG/ImageQuant 改为可选 feature |
| 前端 invoke 与 Canvas 降级切换 | 低 | 非 Tauri 环境（纯浏览器预览）无 invoke | `utils/image.ts` 检测 `window.__TAURI__` 存在性，缺失时回退 Canvas |

### 5.2 定位风险

| 风险 | 说明 | 缓解措施 |
|---|---|---|
| 盲目照搬 ImageToolbox 功能膨胀 | AWMC 是图片专用工具，本项目是通用工具箱 | 图像工具不超过总工具数的 40%；保留开发/办公/系统模块的均衡发展 |
| UI 风格污染 | 引入 mdui 会破坏 WinUI 一致性 | 所有新增工具页强制使用 WinUIonWeb + 现有 CSS 类 |

### 5.3 合规与版权

| 项 | 说明 |
|---|---|
| ImageToolbox 源码 | AWMC 方案明确"仅分析不入库"，本项目同样**不复制** ImageToolbox 或 AWMC 代码，仅参考功能清单与算法思路 |
| AWMC 策划文档 | 本文档引用其功能矩阵，属设计参考；实现全部自行编写 |

### 5.4 实施注意事项

1. **渐进式迁移**：阶段 A 的 Rust 图像命令上线时，保留 Canvas 降级路径（`utils/image.ts` 检测非 Tauri 环境回退），避免破坏现有用户体验。
2. **`registry.ts` 兼容**：新增工具按现有 `ready()` 模式注册，保持"新增一个工具只需在 registry 加一行"的既有心智。
3. **编码器版本对齐**：oxipng/imagequant 版本更新频繁，`Cargo.toml` 锁定次版本号，CI 定期 bump。
4. **测试覆盖**：图像处理纯算法部分（滤镜/对比/pHash）补 Vitest 或 Rust 单元测试。
5. **文档同步**：每阶段完成后更新 `README.md` 的"当前进度"表。
6. **CNB 与 GitHub Actions 并存**：两套工作流独立触发，不互相依赖；产物格式保持一致（NSIS + MSI）。
7. **模板文件夹排除**：`WinUIonWeb模板/` 已加入 `.gitignore`，仅作参考不纳入版本管理。

---

## 6. 总结

本方案从 AWMC 策划中提取了 **图像处理能力矩阵** 这一个核心资产，舍弃了 `.ankyu` 扩展机制（按用户决定）、Material 3 UI、Svelte 技术栈、AI/文档扫描等非核心模块。

- **短期价值**（阶段 A-B）：用 Rust 重写图像管线，解决现有 Canvas 方案的性能与格式支持短板，新增 10+ 图像工具。
- **构建侧**（阶段 C）：新增 CNB 工作流与现有 GitHub Actions 并存，提供双重 CI 保障。

关键原则：**移植逻辑，不移植皮囊**。算法可复用，UI 必须用本项目的 WinUIonWeb 重新实现。
