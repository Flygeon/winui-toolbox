# AWMC 项目规划（v0.2）

> 目标：在桌面端 1:1 复刻 ImageToolbox 的 Material 3 交互 UI，以 Rust 为后端尽可能还原其全部可还原功能，
> 构建以 `.ankyu`（7z 压缩包）为载体的可扩展插件体系。
>
> v0.2 变更：基于 ImageToolbox 源码（HEAD 5b052e8，仅作分析、不入库）完成功能盘点；
> 明确转码为第一基础功能；新增"功能依赖系统"与 ankyu 扫描/加载配置规范。

---

## 1. 项目定位

| 项 | 说明 |
|---|---|
| 名称 | AWMC（**AnkyuWidgetsMediaCenter**） |
| 形态 | 桌面应用（**当前分发目标：Windows**，exe 单文件；后续可扩 macOS/Linux） |
| 内核 | Tauri 2.x + Rust |
| UI | Material Design 3（Material You，1:1 对齐 ImageToolbox） |
| 第一阶段 | 基础包：图片打开 / **格式转码** / 编辑 / 导出 |
| 扩展机制 | `.ankyu` 插件包（7z 归档）：新增 tab、向既有 tab 注入菜单/功能、功能级依赖、嵌套打包、**屏蔽其他包/功能** |
| 远期扩展 | 音频转换、视频转码/裁剪（FFmpeg）等官方 ankyu |

> 合规说明：ImageToolbox（Apache-2.0）源码仅克隆到本地 `ImageToolbox/` 做**功能与实现方式分析**，
> 该目录已被 `.gitignore` 排除，不进入本仓库；AWMC 全部代码自行实现，不复制原项目代码。

---

## 2. 技术选型

| 层 | 选型 | 说明 |
|---|---|---|
| 桌面框架 | **Tauri 2.x** | 轻量、Rust 后端 |
| 前端框架 | **Svelte 5 + Vite** | 包体最小、编译期响应式 |
| MD3 组件库 | **mdui v2** | Web Components、框架无关、内置动态取色/深色模式、维护活跃；不自行重写界面 |
| 图标 | **material-symbols** | variable font，粗细/填充可变 |
| 图像核心 | `image` + `imageproc` | 纯 CPU 管线 |
| EXIF | `kamadak-exif` | 读写 |
| 7z 解压 | `sevenz-rust2` | 纯 Rust |
| 格式编码器 | 见 §4.4 | 按依赖粒度配置 |

---

## 3. UI 复刻策略（对齐 ImageToolbox）

沿用 v0.1 方案：
- **顶层**：TopAppBar + NavigationRail（桌面）/ BottomBar（窄窗口）+ 内容区栈式切换（无路由）。
- **主页**：搜索框 + 筛选 chips（全部/收藏/最近）+ **4 分组工具网格**（编辑/创作/图像/工具），卡片=图标+名称+收藏星标。
- **编辑器页**：顶栏（返回/工具名/操作菜单）+ 中央缩放预览 + 底部 SegmentedButton + Slider 参数调节 + 实时预览（节流 60ms）。
- **设置页**：外观（主题三态/动态取色）、行为、默认值、**扩展管理（ankyu 扫描源/刷新/启用停用卸载）**。
- 视觉：mdui 组件 + MD3 token；动态取色默认开；深色/AMOLED 三态跟随。

---

## 4. 功能盘点与还原矩阵（源自 ImageToolbox 源码分析）

原项目共 60+ feature 模块 / 92+ 工具，按"编辑 / 创作 / 图像 / 工具"4 大分组。下方矩阵为逐模块实现依赖判断结论。

### 4.1 分组与模块全览

| 分组 | 模块 | 核心实现依赖 | Rust 还原 |
|---|---|---|---|
| 编辑 | single-edit 单图编辑 | GPUImage/JH Labs 滤镜链 | ✅ |
| 编辑 | crop 裁剪 | 纯算法 | ✅ |
| 编辑 | filters 滤镜（500+） | GPUImage(OpenGL 着色器) + JH Labs(纯 CPU Java) + G'MIC | ✅ 大部分（着色器数学公开可转 CPU）；G'MIC 走外部二进制 |
| 编辑 | curves 曲线 | 纯算法（通道曲线） | ✅ |
| 编辑 | draw / markup-layers 绘画/标注 | 画布+混合 | ✅（叠加层合成） |
| 编辑 | shader-studio 着色器 | GPU GLSL | ⚠️ 提供内置"着色器效果库"（CPU 翻译），GLSL 编辑器后置 |
| 编辑 | gradient-maker 渐变 | 纯算法 | ✅ |
| 编辑 | erase-background 去背景 | AI 模型（TensorFlow Lite） | ❌ AI ankyu（P4+） |
| 编辑 | document-scanner 文档扫描 | OpenCV（透视变换/去阴影） | ⚠️ 需 opencv rust 绑定，或外部二进制；核心算法可还原 |
| 编辑 | watermarking 水印 | 纯算法（文字/图片叠加） | ✅ |
| 创作 | collage-maker 拼贴 | 纯算法排版 | ✅ |
| 创作 | photomosaic 照片马赛克 | 纯算法 | ✅ |
| 创作 | ascii-art | 纯算法 | ✅ |
| 创作 | noise-generation 噪点 | 纯算法 | ✅ |
| 创作 | texture-generation 纹理 | 纯算法（Perlin 等） | ✅ |
| 创作 | mesh-gradients 网格渐变 | 纯算法 | ✅ |
| 创作 | svg-maker | 纯算法+SVG 编码 | ✅ |
| 创作 | wallpapers-export 壁纸导出 | 纯算法 | ✅ |
| 图像 | resize-convert 缩放+转换 | image 系 | ✅ |
| 图像 | **format-conversion 格式转码** | 34 种编码器（见 4.4） | ✅（核心）/ ⚠️（外部编码器） |
| 图像 | weight-resize 按体积缩放 | 纯算法+编码器 | ✅ |
| 图像 | limits-resize 限尺寸缩放 | 纯算法 | ✅ |
| 图像 | image-splitting / image-cutting | 纯算法（分割/九宫格） | ✅ |
| 图像 | image-stitch 拼接 | 纯算法 | ✅ |
| 图像 | image-stacking 堆栈 | 纯算法（对齐+合成） | ✅ |
| 图像 | multi-frame-fusion 多帧融合 | 纯算法（去噪/合成） | ✅ |
| 图像 | duplicate-finder 重复查找 | 感知哈希（pHash） | ✅ |
| 图像 | compression-lab 压缩实验 | 调用各编码器测量 | ✅ |
| 图像 | batch-rename 批量重命名 | 文件系统 | ✅ |
| 图像 | jxl-tools / webp-tools / gif-tools / apng-tools | 各自编码器 | ✅/⚠️（依赖编码器） |
| 工具 | compare 图像对比 | SSIM/AE/MAE/NCC/PSNR/RMSE | ✅ 全部可还原 |
| 工具 | pick-color / color-tools / palette-tools | 纯算法+格式转换（HEX/RGB/HSL…） | ✅ |
| 工具 | base64-tools / cipher / checksum-tools | 纯算法（AES/DES/… / md5/sha/crc32） | ✅（RustCrypto 系） |
| 工具 | zip 压缩 | 纯算法 | ✅（zip crate） |
| 工具 | delete-exif / edit-exif | EXIF 解析 | ✅ |
| 工具 | scan-qr-code 二维码 | 纯算法 | ✅ 生成(qrcode)/识别(rqrr) |
| 工具 | load-net-image | 网络+解码 | ✅ |
| 工具 | pdf-tools（29 项） | PDF 解析/渲染（MuPDF/Android） | ⚠️ 需外部（lopdf+渲染器 或 mupdf 绑定/二进制）；长线 |
| 工具 | recognize-text OCR | ML Kit | ⚠️ tesseract crate/二进制（ankyu） |
| 工具 | audio-cover-extractor | FFmpeg 解封装 | ⚠️ 需 FFmpeg（归 audio ankyu） |
| 工具 | media-picker / libraries-info / usage-statistics / help / settings / easter-egg | UI/系统 | ✅（UI 复刻） |
| AI | ai-tools 系列 | AI 模型 | ❌ 统一走 AI ankyu（P4+） |

### 4.2 Rust 可还原清单（第一阶段目标）
裁剪/旋转/翻转/缩放（多算法）/限制尺寸/按体积缩放、单图编辑、500+ 滤镜中**纯算法滤镜**（JH Labs 系 + GPUImage 公开着色器转 CPU，首批 100+）、曲线、渐变、网格渐变、噪点/纹理生成、ASCII、照片马赛克、拼贴、水印、拼接/分割/九宫格/堆栈/多帧融合、重复查找（pHash）、图像对比（6 算法）、格式转码（核心）、压缩实验、批量重命名、取色/调色板、Base64/AES/DES 加密/校验和、ZIP、EXIF 删除/编辑、二维码生成/识别。

### 4.3 难还原/需扩展的（明确边界）
| 功能 | 原因 | 方案 |
|---|---|---|
| 去背景/超分/AI 滤镜 | 需模型推理 | `ai` 官方 ankyu（内置 ONNX Runtime） |
| OCR | 需识别引擎 | `ocr` ankyu（tesseract） |
| 文档扫描 | OpenCV 透视变换 | `scanner` ankyu 或 opencv-rs 编译进包 |
| PDF 全功能 | 渲染/解析复杂 | `pdf` ankyu（mupdf 绑定或外部二进制） |
| G'MIC 滤镜 | C++ 巨型库 | `gmic` ankyu（随包二进制） |
| 音频封面提取 / 视频功能 | FFmpeg | `audio`/`video` ankyu（FFmpeg 静态构建） |

### 4.4 格式转码支持矩阵（34 种编码器 → 依赖分级）
| 格式 | 原实现 | AWMC 实现 | 依赖 |
|---|---|---|---|
| JPG / JPEG | libjpeg | `image`(jpeg) + `mozjpeg` | 内置 |
| **MozJPEG** | mozjpeg | `mozjpeg` crate | 内置 |
| **Jpegli** | libjxl | `libjxl` 绑定 | 外部编码器 |
| PNG Lossless | Android | `png`(zlib) | 内置 |
| **PNG OxiPNG** | **Rust oxipng** | `oxipng` crate | 内置 |
| **PNG Lossy / ImageQuant** | **Rust imagequant** | `imagequant` crate | 内置 |
| BMP | Android | `image`(bmp) | 内置 |
| WEBP Lossless/Lossy | libwebp | `image`(webp) 或 `libwebp` 绑定 | 内置 |
| **AVIF ×4（AV1/AV2）** | libaom | `ravif`(编码) + `dav1d`(解码) | 外部编码器 |
| **HEIC/HEIF ×6（含 VVC）** | libheif+x265 | `libheif-rs` | 外部编码器 |
| **JXL ×4** | libjxl | `libjxl` 绑定 | 外部编码器 |
| **JP2 / J2K** | openjpeg | `openjpeg-sys` | 外部编码器 |
| TIFF/TIF | Android | `image`(tiff) | 内置 |
| QOI | — | `image`(qoi) | 内置 |
| ICO | Android | `image`(ico) | 内置 |
| GIF | Android | `image`(gif) | 内置 |

> 每个编码器都是一个"功能依赖"（见 §6）：内置 crate 为 builtin 依赖；`libjxl`/`libheif`/`ravif`/`openjpeg` 等可作为**独立 ankyu 编码器扩展**——安装后转码面板对应项自动激活。

---

## 5. 系统架构

```
┌────────────────────────────────────────────────────┐
│ Svelte 5 前端 (WebView)                            │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐          │
│  │ Home     │ │ Editor   │ │ Settings  │ ← 栈式切换 │
│  └────┬─────┘ └────┬─────┘ └─────┬─────┘          │
│       └────────────┼─────────────┘                 │
│  ┌─────────────────────────────────────┐           │
│  │ 依赖状态机 DepState                   │           │
│  │  builtin ✓ / ankyu ✓ / missing ✗    │           │
│  │  → 工具可见性(灰显/折叠/隐藏)           │           │
│  └──────────────────┬──────────────────┘           │
│  ┌─────────────────────────────────────┐           │
│  │ 扩展注册表 Registry                   │           │
│  │  tabs / injections / capabilities   │           │
│  └──────────────────┬──────────────────┘           │
│  window.awmc API（invoke 封装）                     │
├─────────────────────┼──────────────────────────────┤
│ Tauri IPC（invoke / event）                         │
├─────────────────────┼──────────────────────────────┤
│ Rust 后端                                          │
│  ┌─────────────┐  ┌──────────────┐ ┌────────────┐ │
│  │ image 管线   │  │ 转码引擎       │ │ 扩展加载器   │ │
│  │ edit/filter │  │ 34 编码器     │ │ scan/extract│ │
│  │ preview     │  │ 依赖探测      │ │ nested/reg  │ │
│  └─────────────┘  └──────────────┘ └────────────┘ │
│  外部编码器 bridge：libjxl / libheif / ravif /      │
│  openjpeg / gmic / tesseract / ffmpeg（按需加载）    │
└────────────────────────────────────────────────────┘
```

数据流（编辑/转码）：前端参数 → `invoke` → Rust 处理 → 下采样 dataURL 预览 / 落盘导出。

---

## 6. 功能依赖系统（新增核心机制）

### 6.1 概念
每个工具/功能可声明**依赖**（`dependencies`）。依赖来源两类：
- `builtin:<crate/feature>`：编译进核心的（如 `builtin:jpeg`、`builtin:oxipng`）。
- `ankyu:<pkg-id>`：由 ankyu 扩展提供（如 `ankyu:com.awmc.codec-jxl`、`ankyu:com.awmc.ffmpeg`、`ankyu:com.awmc.ocr`）。

依赖状态：`present`（已加载）/ `missing`（未加载）。

### 6.2 缺失依赖时的三种展示策略（清单可自由配置）
| 策略 | 行为 | 适用 |
|---|---|---|
| `grey`（默认） | 功能**灰显**，仍可见；灰显位置为"tab 底部（独立依赖区）"或"所属分类底部（折叠组）"，清单可配置 | 一般功能 |
| `collapse` | **折叠**于功能所处分类底部，展开后可看到（含依赖提示） | 次要功能 |
| `hide` | **不显示任何与该功能相关的信息** | 不希望暴露的功能 |

- `grey`/`collapse` 时：**hover（悬停）卡片显示依赖清单**（工具提示：缺少 `ankyu:com.awmc.codec-jxl` 等），点击可跳转设置页安装。
- 依赖全部满足后自动恢复正常显示/激活；ankyu 卸载或禁用后自动回退。
- 清单示例：
```json
{
  "id": "jxl-convert",
  "title": "转换为 JXL",
  "dependencies": ["builtin:jpeg", "ankyu:com.awmc.codec-jxl"],
  "missingBehavior": "grey",
  "missingPlacement": "categoryBottom"
}
```
- 前端以 Web Components 封装依赖卡片；DepState 由 Rust 在扫描后推送（含版本校验 `minVersion`）。

---

## 7. ankyu 扩展规范（v0.2 更新）

### 7.1 包格式（不变）
`.ankyu` = 7z 归档：根目录 `ankyu.json` 清单 + `frontend/`（Web Components 入口）+ `backend/`（可选二进制）+ 可选子 `.ankyu`（嵌套递归，层级 ≤3 防环）。

### 7.2 清单 v2（新增 capabilities / dependencies / placement）
```json
{
  "id": "com.awmc.audio",
  "name": "音频工具",
  "version": "1.0.0",
  "minAppVersion": "0.1.0",
  "capabilities": ["run:bin", "fs:extension"],
  "provides": ["format:wav", "format:mp3"],          // 提供的能力（可被依赖引用）
  "tabs": [{ "id": "audio", "title": "音频", "icon": "music_note",
             "entry": "frontend/audio-tab.js", "position": "end" }],
  "injections": [{ "targetTab": "tools", "targetGroup": "图像处理",
                   "item": { "id": "audio-cover", "title": "提取音频封面",
                             "icon": "album", "entry": "frontend/audio-cover.js",
                             "dependencies": ["ankyu:com.awmc.ffmpeg"],
                             "missingBehavior": "grey" } }]
}
```
- `provides` 使功能依赖 `ankyu:com.awmc.ffmpeg` 在安装后自动满足（依赖匹配 = 提供者注册）。
- 菜单项（injections）同样支持 dependencies 与三态展示策略。

### 7.3 扫描与加载（用户指定 + 双刷新）
**扫描源**：
1. **默认**：应用同级目录（可执行文件所在目录）下的 `extensions/` 文件夹 + 散落的 `*.ankyu` 文件——"ankyu 包扫描范围是同级目录"。
2. **设置页扩展管理**：可**自行添加加载源**——选择单个 `.ankyu` 文件 或 选择含 `.ankyu` 的文件夹（记忆进配置，可增删/排序）。
3. 所有加载源合并去重（按包 id 优先"后加载覆盖"策略，可回滚）。

**刷新时机**：
- **应用每次启动时自动刷新**（后台异步，完成后推送 DepState 更新）。
- **设置页手动刷新按钮** + 文件系统 watcher（可选，监听扩展目录变化自动重扫）。
- 新增/移除加载源后立即增量刷新。

**加载流程**：扫描 `.ankyu` → `sevenz-rust2` 解压到隔离 staging（路径穿越防护/哈希校验）→ 递归处理嵌套子包 → 解析清单 → 注册 tabs/injections/provides → 更新 DepState → 前端 `import()` 各 entry 注册自定义元素。

### 7.4 安全模型（不变）
路径白名单、符号链接禁止、权限按 capabilities 声明、二进制仅限 staging 内且数组参数执行。

---

## 8. 基础包功能范围（Phase 1-2 最终版）

| 分组 | 功能 | 依赖 |
|---|---|---|
| 文件 | 打开（拖拽/选择器）、最近文件、保存/另存为、导出配置 | builtin |
| **转码（首项）** | 34 编码器矩阵（§4.4），质量/Effort/无损参数，批量转码，预览，EXIF 剥离选项 | 按编码器分级 |
| 变换 | 裁剪/旋转/翻转/缩放（算法可选）/限尺寸/按体积缩放 | builtin |
| 调整 | 亮度/对比度/饱和度/色相/伽马/色温 | builtin |
| 滤镜 | 首批 100+ 纯算法滤镜（分类：颜色/模糊/锐化/艺术/边缘/噪点…），持续扩充 | builtin |
| 曲线 | 单通道/全通道曲线 | builtin |
| 工具 | 图像对比、重复查找、校验和、Base64、ZIP、EXIF、二维码、批量重命名 | builtin |
| 创作 | ASCII、噪点/纹理/渐变生成、拼贴、马赛克、水印、分割/拼接 | builtin |
| 元数据 | EXIF 查看/删除/编辑 | builtin |

验收：P2 结束时可完成"打开 → 任意转码/编辑 → 导出"闭环，且上述内置依赖全部 present。

---

## 9. 里程碑路线图（v0.2 更新）

| 阶段 | 内容 | 验收 |
|---|---|---|
| **P0 本期** | 方向规划、功能盘点矩阵、依赖系统与 ankyu 规范定稿 | 本文档 |
| **P1 骨架** | Tauri+Svelte5+mdui+material-symbols 工程；Home 4 分组网格；打开/显示图片 | MD3 UI 可见，能开图 |
| **P2 转码** | 转码引擎（内置编码器）+ 批量 + 预览 + 导出；编码器依赖分级落地 | 34 编码器矩阵（内置部分）可用 |
| **P3 编辑** | 裁剪/旋转/缩放/滤镜链/曲线/调整 + 撤销重做 + 实时预览 | 基础包编辑闭环 |
| **P4 扩展框架** | ankyu 加载器、嵌套递归、依赖状态机（灰显/折叠/隐藏）、扫描源配置、双刷新、扩展管理页 | 手写 demo ankyu 可加 tab/菜单并激活依赖 |
| **P5 官方 ankyu** | codec-jxl/heif/avif、gmic、ocr、scanner、audio、video（FFmpeg） | 安装即用 |
| **P6 打磨** | 动态主题/设置/收藏/最近/搜索、打包分发、安全加固、AI ankyu | 接近 ImageToolbox 体验 |

---

## 10. 待定决策点
1. ~~ankyu 打包工具：独立 CLI vs 应用内"打包扩展"向导~~ → **已定：打包器做成一个独立 ankyu 包**（如 `com.awmc.packager`），不编译进核心，核心只负责解压与加载。
2. 外部编码器（libjxl/libheif/ravif）默认**编译进核心**还是**作为官方 ankyu**分发（影响安装包体积：JXL+HEIF+AVIF 库约 +15~30MB）——倾向 ankyu 化（契合依赖系统）。 官方ankyu分发Codec.ankyu 然后同时也支持读取系统已有（环境变量内）的（编码器和FFmpeg）和指定FFmpeg
3. 动态取色取色源（壁纸跨平台成本高）：MVP 先做主色选择+预设调色板。
4. 分发渠道（NSIS/DMG/AppImage）与 ankyu 签名校验（P6）。 #暂时仅作windows平台（包含一些ankyu包）和 exe单文件 你写个cnb工作流 自动编译exe单文件和ankyu包（包括FFmpeg和你说的那些东西自动拉取最新版本 然后用镜像源 下载前对列表ping 5个一组 小于129ms则选中组内最小延迟开始fetch 否则继续 直到全部完成（最多进行2.9min 否则直接选中最低延迟的开始 然后如果超时（根据依赖对应的预期时间（体积/290kib）s 则直接终止job）
5. 文档扫描/PDF：优先"外部二进制 ankyu"还是"rust 绑定编译"。 外部ankyu
#额外支持 ankyu包 可以指定屏蔽其他ankyu包的某些功能
