# AWMC ankyu 打包指南

> 面向扩展开发者的实操手册：如何把一个功能打包成 `.ankyu` 扩展，安装到 AWMC 中。
> 规范定义见 `docs/PLAN.md` §7（清单 v3），本指南聚焦"怎么写、怎么打、怎么装"。

---

## 1. 什么是 ankyu

`.ankyu` 本质是一个 **7z 压缩包**，包含：

- `ankyu.json` — 清单（必填，描述包的能力与 UI 声明）
- `frontend/` — Web Components 入口脚本（新增 tab 或注入菜单项时必填）
- `backend/` — 可选的原生二进制（如编码器、FFmpeg、OCR 引擎）
- 子 `.ankyu` — 可选，嵌套打包（一个聚合包可内含多个独立子包，递归加载，层级 ≤3）

AWMC 启动时扫描应用同级目录（`extensions/` 文件夹与散落的 `*.ankyu`）以及设置页中添加的加载源，解压校验后注册。

---

## 2. 快速上手：最小示例

```bash
# 1. 创建包目录
mkdir -p my-tool/ankyu.json
```

`ankyu.json` 内容：

```json
{
  "id": "com.example.my-tool",
  "name": "我的工具",
  "version": "1.0.0",
  "minAppVersion": "0.1.0",
  "capabilities": [],
  "tabs": [],
  "injections": []
}
```

```bash
# 2. 用 7z 打成 .ankyu
cd my-tool
7z a -t7z -mx=9 ../com.example.my-tool.ankyu .
```

```bash
# 3. 安装：放到应用同级目录的 extensions/ 下（或在设置页添加该文件/文件夹）
mv ../com.example.my-tool.ankyu <AWMC目录>/extensions/
```

重启应用（或点设置页"手动刷新"）即可加载。

> 7z 打包时在包目录内执行 `7z a ... .`（打包当前目录的全部内容，**包含根 ankyu.json**），不要把外层目录打进去。

---

## 3. 清单 ankyu.json 字段参考（v3）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | ✅ | 全局唯一标识，如 `com.awmc.ffmpeg`。冲突时后加载覆盖 |
| `name` | string | ✅ | 展示名称 |
| `version` | string | ✅ | 语义化版本 |
| `minAppVersion` | string | | 所需最低 AWMC 版本，不满足则跳过加载并提示 |
| `description` | string | | 展示说明 |
| `capabilities` | string[] | | 权限声明：`run:bin`（执行 backend 二进制）、`fs:extension`（扩展目录文件访问）等。**未声明即无权限** |
| `provides` | string[] | | 提供的能力标识（`engine:ffmpeg`、`codec:jxl`、`format:mp3`…），供其他功能作依赖引用 |
| `blocks` | string[] | | 屏蔽声明：`pkg:<id>` 屏蔽整个包；`function:<pkg-id>.<item-id>` 屏蔽指定功能（见 §6） |
| `tabs` | array | | 新增顶层 tab（见 §4.1） |
| `injections` | array | | 向已有 tab 注入菜单/功能（见 §4.2） |

`provides` 与依赖匹配：功能声明 `dependencies: ["ankyu:com.awmc.ffmpeg"]` 时，只要有包 `id == com.awmc.ffmpeg`（或其 `provides` 命中）即视为依赖满足，该功能自动激活。

---

## 4. 三种功能形态

### 4.1 新增 tab（独立页面）

`tabs` 数组声明，`entry` 指向 `frontend/` 下的 JS（Web Component，`import()` 动态加载）：

```json
{
  "id": "com.example.audio",
  "name": "音频工具",
  "tabs": [
    {
      "id": "audio",
      "title": "音频",
      "icon": "music_note",
      "entry": "frontend/audio-tab.js",
      "position": "end"
    }
  ]
}
```

`position`：`start`（最前）/ `end`（最后）/ 省略（默认分组内按序）。

`frontend/audio-tab.js` 最小模板（注册自定义元素）：

```js
class AudioTab extends HTMLElement {
  connectedCallback() {
    this.innerHTML = '<mdui-card class="p-4"><h3>音频工具</h3></mdui-card>';
  }
}
customElements.define('awmc-ext-audio', AudioTab);
```

### 4.2 注入菜单/功能（进已有 tab）

`injections` 数组声明，指定目标 tab 与分组，可带依赖与三态展示策略：

```json
{
  "injections": [
    {
      "targetTab": "tools",
      "targetGroup": "图像处理",
      "item": {
        "id": "audio-cover",
        "title": "提取音频封面",
        "icon": "album",
        "entry": "frontend/audio-cover.js",
        "dependencies": ["ankyu:com.awmc.ffmpeg"],
        "missingBehavior": "grey"
      }
    }
  ]
}
```

`missingBehavior`（依赖未满足时的展示策略，按包配置）：
- `grey` — 灰显，hover 显示缺失依赖清单（默认）
- `collapse` — 折叠到所在分类底部，展开可见原因
- `hide` — 完全隐藏，安装依赖后出现

### 4.3 纯提供者（无 UI）

只声明 `provides`，`tabs`/`injections` 为空数组。适合编码器、引擎、库类依赖：

```json
{
  "id": "com.awmc.codec.jxl",
  "name": "JPEG XL 编码器",
  "capabilities": ["run:bin"],
  "provides": ["codec:jxl"],
  "tabs": [],
  "injections": []
}
```

---

## 5. 嵌套子包（聚合分发）

一个 ankyu 的根目录可放入多个子 `.ankyu`，子包解压后**各自独立注册**（独立 id / 启用停用），父包只作分发容器。用户删除子包文件即移除对应功能，不影响其他子包。

典型：官方 `Codec.ankyu` 结构：

```
Codec.ankyu
├── ankyu.json                 # 根清单（id: com.awmc.codec，仅作容器）
├── com.awmc.codec.mozjpeg.ankyu
├── com.awmc.codec.jpegli.ankyu
├── com.awmc.codec.jxl.ankyu
├── com.awmc.codec.avif.ankyu
├── com.awmc.codec.heif.ankyu
└── com.awmc.codec.jp2.ankyu
```

用脚本批量生成子包并聚合：

```bash
for id in mozjpeg jpegli jxl avif heif jp2; do
  mkdir -p "pkg/com.awmc.codec.$id"
  # 写入对应 ankyu.json ...
  (cd "pkg/com.awmc.codec.$id" && 7z a -t7z -mx=9 "../com.awmc.codec.$id.ankyu" .)
done
# 根目录放置根清单后整体打包
(cd pkg && 7z a -t7z -mx=9 ../Codec.ankyu .)
```

> 打包子包时注意：子包内文件结构同样为 `ankyu.json + backend/…`，打包命令在子包目录内执行，避免把外层路径打进去。

---

## 6. 屏蔽机制（blocks）

清单可声明屏蔽其他包的整个或部分功能：

| 写法 | 作用 |
|---|---|
| `"blocks": ["pkg:com.example.legacy"]` | 屏蔽整个包，其全部 tab/注入/能力视为不存在 |
| `"blocks": ["function:com.example.tools.duplicate"]` | 只屏蔽指定包内某个功能/菜单项（`<pkg-id>.<item-id>`） |
| `"blocks": ["function:com.example.tools.*"]` | 前缀匹配，屏蔽指定包下的一组功能 |

规则：
- 被屏蔽项若已注册会立即移除或灰显；设置页可查看"被 X 屏蔽"原因。
- 屏蔽包卸载/禁用后，被屏蔽项自动恢复。
- 循环屏蔽（A 屏蔽 B、B 屏蔽 A）：按加载顺序后者生效并告警。
- **核心内建功能不可被屏蔽**（只允许屏蔽 ankyu 提供的内容）。

---

## 7. 依赖系统速查

功能声明依赖（`dependencies`），依赖来源可为：

| 依赖写法 | 含义 |
|---|---|
| `builtin` | 核心自带能力（总是 present） |
| `ankyu:<pkg-id>` | 安装某 ankyu 包（或其 provides 命中）即满足 |
| `codec:jxl` / `engine:ffmpeg` / `format:mp3` | 由提供者的 `provides` 满足（含系统环境变量探测的 `system:<name>` 提供者） |

依赖缺失时按包的 `missingBehavior` 策略展示；依赖满足后功能自动激活，无需重启。

---

## 8. 官方打包脚本（构建流水线用）

仓库 `scripts/package-ankyu.sh` 产出 `dist/`：

- `com.awmc.ffmpeg.ankyu` — FFmpeg 引擎（内含 `backend/bin/ffmpeg.exe`、`ffprobe.exe`）
- `Codec.ankyu` — 6 个独立编码器子包聚合（mozjpeg / jpegli / jxl / avif / heif / jp2）

本地运行：

```bash
apt-get install -y p7zip-full        # 需要 7z
bash scripts/fetch-deps.sh           # 先拉取 FFmpeg（镜像择优下载）
bash scripts/package-ankyu.sh        # 生成 dist/*.ankyu
```

产物放入应用同级目录 `extensions/`（或设置页添加）即可被扫描加载。

---

## 9. 安装、扫描与刷新

- **默认扫描范围**：应用可执行文件同级目录的 `extensions/` 文件夹 + 散落 `*.ankyu` 文件。
- **自定义加载源**：设置页 → 扩展管理，可添加单个 `.ankyu` 文件或含 `.ankyu` 的文件夹（记忆进配置，可增删排序）。
- **刷新时机**：应用每次启动自动刷新；设置页手动刷新；新增/移除加载源立即增量刷新。
- **覆盖策略**：同 id 冲突按后加载覆盖，可回滚。

---

## 10. 安全与限制

- 嵌套层级 ≤3，防环校验。
- `capabilities` 最小权限：`run:bin` / `fs:extension` 按需声明，未声明即无权限。
- backend 二进制仅限 staging 目录内执行，仅支持数组参数（禁止 shell 拼接）。
- 解压带路径穿越防护与哈希校验。
- 核心内建功能不可被屏蔽（见 §6）。
