<template>
  <div class="tb-section markdown-tool">
    <div class="tb-card md-toolbar">
      <div class="tb-row">
        <button type="button" class="tb-btn tb-btn-primary" @click="loadSample">示例</button>
        <button type="button" class="tb-btn" @click="exportHtml">导出 HTML</button>
        <button type="button" class="tb-btn" @click="copyHtml">复制 HTML</button>
        <button type="button" class="tb-btn" @click="exportDocx">导出 Word (.docx)</button>
        <button type="button" class="tb-btn" @click="exportPdf">导出 PDF（打印）</button>
        <button type="button" class="tb-btn" @click="input = ''">清空</button>
        <span class="tb-hint tb-grow md-char-count">{{ charCount }} 字</span>
      </div>
    </div>

    <div class="md-panes">
      <div class="md-pane">
        <WinTextBox
          v-model:Text="input"
          PlaceholderText="# 在此输入 Markdown…&#10;&#10;支持标题、列表、表格、代码块、引用等 GFM 语法"
          AcceptsReturn
          TextWrapping="NoWrap"
          class="md-editor"
          Height="520" />
      </div>
      <div class="md-pane md-pane-preview">
        <div class="md-preview" v-html="previewHtml"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import WinTextBox from "@/winui/components/WinTextBox.vue";
import { markdownToHtml, markdownToDocxBlob, printHtmlToPdf } from "@/utils/markdown-export";
import { downloadBytes, downloadText } from "@/utils/download";
import { writeClipboard } from "@/utils/clipboard";
import { usePersistedInput } from "@/composables/usePersistedInput";

const input = usePersistedInput("markdown.input");

const previewHtml = computed(() => markdownToHtml(input.value));
const charCount = computed(() => [...input.value].length);

function wrapHtml(html: string): string {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>Markdown 导出</title>
<style>body{font-family:'Segoe UI','Microsoft YaHei',sans-serif;max-width:820px;margin:2em auto;padding:0 1.5em;line-height:1.7;color:#1a1a1a}
h1,h2,h3{color:#0067c0} pre{background:#f3f3f3;border-radius:6px;padding:12px 14px;overflow:auto}
code{background:#f3f3f3;border-radius:4px;padding:1px 5px;font-family:Consolas,monospace}
blockquote{border-left:4px solid #ccc;margin:0;padding-left:1em;color:#555}
table{border-collapse:collapse} th,td{border:1px solid #ccc;padding:6px 12px}
img{max-width:100%}</style></head><body>${html}</body></html>`;
}

function exportHtml() {
  downloadText(wrapHtml(previewHtml.value), "markdown.html", "text/html;charset=utf-8");
}

async function copyHtml() {
  await writeClipboard(wrapHtml(previewHtml.value));
}

async function exportDocx() {
  if (!input.value.trim()) return;
  const blob = await markdownToDocxBlob(input.value);
  downloadBytes(new Uint8Array(await blob.arrayBuffer()), "markdown.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
}

function exportPdf() {
  if (!input.value.trim()) return;
  printHtmlToPdf(previewHtml.value, "markdown");
}

function loadSample() {
  input.value = `# WinUI 工具箱

一款**本地优先**的 Windows 多功能工具箱。

## 特性

- 原生 WinUI 观感
- 离线可用，数据不出设备
- 基于 Tauri 2 + Vue 3

> 所有处理均在本地完成，无需联网。

## 表格示例

| 工具 | 模块 | 状态 |
| --- | --- | --- |
| 时间戳转换 | 开发者工具 | ✅ 已完成 |
| PDF 工具集 | 办公与文档 | ✅ 已完成 |

## 代码示例

\`\`\`ts
const greet = (name: string) => \`你好，\${name}！\`;
console.log(greet("工具箱"));
\`\`\`
`;
}
</script>

<style scoped>
.md-toolbar {
  padding: 12px 18px;
}

.md-char-count {
  text-align: right;
  flex: 0 0 auto;
}

.md-panes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}

.md-pane {
  min-width: 0;
}

.md-pane-preview {
  overflow: hidden;
  border-radius: 8px;
}

.md-preview {
  max-height: 520px;
  height: 520px;
  overflow-y: auto;
}

@media (max-width: 900px) {
  .md-panes {
    grid-template-columns: 1fr;
  }
}
</style>
