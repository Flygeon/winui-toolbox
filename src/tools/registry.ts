import { defineAsyncComponent, type Component } from "vue";

export type ToolStatus = "ready" | "planned";

export interface ToolDef {
  id: string;
  title: string;
  description: string;
  icon: string; // Segoe Fluent / MDL2 字形
  status: ToolStatus;
  /** 计划书中的开发阶段 */
  phase: number;
  component: Component | null;
  /** 计划中的功能要点（占位页展示用） */
  features?: string[];
}

export interface ToolModuleDef {
  id: string;
  title: string;
  icon: string;
  tools: ToolDef[];
}

function ready(
  id: string,
  title: string,
  description: string,
  icon: string,
  load: () => Promise<{ default: Component }>
): ToolDef {
  return {
    id,
    title,
    description,
    icon,
    status: "ready",
    phase: 2,
    component: defineAsyncComponent(load),
  };
}

function planned(id: string, title: string, description: string, icon: string, phase: number, features: string[]): ToolDef {
  return {
    id,
    title,
    description,
    icon,
    status: "planned",
    phase,
    component: null,
    features,
  };
}

/** 五大模块（计划书第三节），第二阶段实现 Dev Tools 与 Office & Doc 的核心子集 */
export const toolModules: ToolModuleDef[] = [
  {
    id: "dev",
    title: "开发者工具",
    icon: "",
    tools: [
      ready("timestamp", "时间戳转换", "Unix 时间戳与日期时间的双向转换", "", () => import("@/tools/timestamp/index.vue")),
      ready("codec", "编码 / 解码", "Base64、URL、HTML 实体 编解码", "", () => import("@/tools/codec/index.vue")),
      ready("json", "JSON 格式化", "JSON 格式化、校验、压缩与排序", "", () => import("@/tools/json/index.vue")),
      ready("hash", "哈希与加解密", "MD5 / SHA 系列哈希与 AES 加解密", "", () => import("@/tools/hash/index.vue")),
      ready("qrcode", "二维码生成", "生成文本、网址、Wi-Fi 二维码", "", () => import("@/tools/qrcode/index.vue")),
      ready("uuid", "UUID / 随机密码", "批量生成 UUID 与高强度随机密码", "", () => import("@/tools/uuid/index.vue")),
      ready("jwt", "JWT 调试", "解码并校验 JWT Token", "", () => import("@/tools/jwt/index.vue")),
      ready("regex", "正则测试", "正则表达式匹配测试与常用速查", "", () => import("@/tools/regex/index.vue")),
      planned("cron", "Cron 表达式", "可视化解析 Cron 表达式与未来执行时间预览", "", 2, ["可视化解析 Cron 表达式的含义", "预览未来 N 次执行时间", "常用 Cron 模板（每分钟/每小时/每天等）"]),
      planned("network", "IP / 网络工具", "本地 IP 查询、Ping、端口连通性检测", "", 2, ["本机 IP 与网络接口信息查询", "Ping 延迟测试", "端口连通性检测与子网计算"]),
    ],
  },
  {
    id: "office",
    title: "办公与文档",
    icon: "",
    tools: [
      ready("text", "文本处理", "字数统计、大小写转换、行操作", "", () => import("@/tools/text/index.vue")),
      ready("mask", "敏感信息脱敏", "身份证、手机号、银行卡一键掩码", "", () => import("@/tools/mask/index.vue")),
      ready("diff", "文本比对", "文本行级差异对比（Diff）", "", () => import("@/tools/diff/index.vue")),
      planned("markdown", "Markdown 编辑器", "实时预览、语法高亮、导出 HTML", "", 2, ["Markdown 实时预览", "常用语法高亮", "导出 HTML / 复制到剪贴板"]),
      planned("mdconvert", "Markdown 转 PDF / Word", "将 Markdown 导出为排版精美的 PDF 或 Word", "", 2, ["Markdown → PDF", "Markdown → Word (docx)", "样式与主题设置"]),
      planned("tables", "表格数据转换", "CSV / JSON / Excel 之间的互相转换", "", 2, ["CSV ↔ JSON", "Excel ↔ CSV / JSON", "轻量级表格预览"]),
      planned("pdf", "PDF 工具集", "PDF 合并、拆分、加密、压缩", "", 3, ["PDF 合并与拆分", "PDF 加密 / 解密", "PDF 压缩"]),
    ],
  },
  {
    id: "media",
    title: "多媒体",
    icon: "",
    tools: [
      planned("image", "图片格式转换", "JPG / PNG / WebP / AVIF 批量转换", "", 3, ["批量格式转换", "分辨率调整", "质量参数控制"]),
      planned("compress", "图片压缩", "在保证画质的前提下压缩图片", "", 3, ["批量压缩", "目标大小预估", "画质对比预览"]),
      planned("media", "音视频转换", "常见格式转换、音频提取、裁剪", "", 3, ["格式转换（MP4/MKV/AVI…）", "提取音频轨道", "音视频裁剪"]),
      planned("icon", "图标生成", "一键生成适用各平台的 App Icon", "", 3, ["从单张图片生成全套图标", "iOS / Android / Windows 尺寸", "圆角与背景处理"]),
      planned("gif", "GIF 动图制作", "多图或短视频转高质量 GIF", "", 3, ["图片序列 → GIF", "视频 → GIF", "帧率与尺寸调整"]),
      planned("ocr", "OCR 文字识别", "本地轻量级离线 OCR，截图秒提取文字", "", 3, ["截图 / 图片文字识别", "离线本地模型", "结果复制与导出"]),
      planned("screenshot", "截图与录屏", "区域截图（长截图、贴图）与录屏", "", 3, ["区域截图", "长截图拼接", "区域录屏"]),
      planned("audio", "音频格式转换", "MP3 / WAV / FLAC / AAC 互转", "", 3, ["音频格式互转", "采样率 / 比特率调整", "批量处理"]),
    ],
  },
  {
    id: "system",
    title: "系统与效率",
    icon: "",
    tools: [
      planned("monitor", "硬件监控", "CPU、内存、磁盘、网络实时监控", "", 4, ["实时曲线图", "进程 / 内存占用", "磁盘与网络 IO"]),
      planned("cleanup", "系统清理", "清理临时文件、浏览器缓存", "", 4, ["扫描临时文件", "浏览器缓存清理", "回收站 / 大文件分析"]),
      planned("hotkey", "快捷键启动", "全局热键快速唤出工具", "", 4, ["注册全局热键", "热键呼出指定工具", "开机自启"]),
      planned("clipboard", "剪贴板历史", "记录和管理剪贴板内容", "", 4, ["历史记录管理", "固定常用条目", "快捷粘贴"]),
      planned("lan", "局域网快传", "局域网点对点文件传输", "", 4, ["局域网设备发现", "P2P 文件传输", "传输进度与断点续传"]),
      planned("env", "环境变量管理", "可视化查看、编辑 Windows 环境变量", "", 4, ["用户 / 系统变量浏览", "安全编辑与备份", "路径 PATH 管理"]),
      planned("port", "端口占用查询", "查看端口占用并一键结束进程", "", 4, ["按端口 / PID 查询", "进程信息展示", "一键结束进程"]),
      planned("pomodoro", "番茄钟 / 白噪音", "番茄钟专注计时与本地白噪音", "", 4, ["番茄钟计时器", "任务记录", "本地白噪音播放"]),
    ],
  },
];

export const allTools: ToolDef[] = toolModules.flatMap((m) => m.tools);

export function findToolById(id: string | undefined | null): ToolDef | undefined {
  if (!id) return undefined;
  return allTools.find((t) => t.id === id);
}

export function findModuleById(id: string | undefined | null): ToolModuleDef | undefined {
  if (!id) return undefined;
  return toolModules.find((m) => m.id === id);
}

export const firstToolId: string = allTools[0].id;
