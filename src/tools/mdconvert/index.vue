<template>
  <div class="tb-section mdconvert-tool">
    <div class="tb-card mdconvert-toolbar">
      <div class="tb-row">
        <button type="button" class="tb-btn tb-btn-primary" @click="exportDocx">导出 Word (.docx)</button>
        <button type="button" class="tb-btn" @click="exportPdf">导出 PDF（系统打印）</button>
        <button type="button" class="tb-btn" @click="copyHtml">复制 HTML</button>
        <button type="button" class="tb-btn" @click="loadSample">示例</button>
        <button type="button" class="tb-btn" @click="input = ''">清空</button>
      </div>
      <p class="tb-hint">PDF 通过系统打印对话框生成（可选“Microsoft Print to PDF”），中文显示无缺字；Word 导出使用中文字体，可在 Office / WPS 中打开编辑。</p>
    </div>

    <div class="md-panes">
      <div class="md-pane">
        <WinTextBox
          v-model:Text="input"
          PlaceholderText="粘贴 Markdown 内容…"
          AcceptsReturn
          TextWrapping="NoWrap"
          Height="420" />
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
import { downloadBytes } from "@/utils/download";
import { writeClipboard } from "@/utils/clipboard";

const input = ref("");

const previewHtml = computed(() => markdownToHtml(input.value));

async function exportDocx() {
  if (!input.value.trim()) return;
  const blob = await markdownToDocxBlob(input.value);
  downloadBytes(new Uint8Array(await blob.arrayBuffer()), "markdown.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
}

function exportPdf() {
  if (!input.value.trim()) return;
  printHtmlToPdf(previewHtml.value, "markdown");
}

async function copyHtml() {
  await writeClipboard(previewHtml.value);
}

function loadSample() {
  input.value = `# 会议纪要

## 议题

1. 项目进度
2. 风险与问题
3. 下一步计划

## 结论

- 第一阶段已完成，进入第二阶段
- 预计 **两周** 内交付核心工具

> 记录人：工具箱 ｜ 2026-08-12
`;
}
</script>

<style scoped>
.mdconvert-toolbar {
  padding: 12px 18px;
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
  max-height: 420px;
  overflow-y: auto;
}

@media (max-width: 900px) {
  .md-panes {
    grid-template-columns: 1fr;
  }
}
</style>
