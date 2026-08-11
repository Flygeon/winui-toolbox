<template>
  <div class="tb-section text-tool">
    <div class="tb-two-col">
      <div class="tb-card">
        <div class="tb-row">
          <p class="tb-title tb-grow">输入</p>
          <button type="button" class="tb-btn" @click="input = ''">清空</button>
        </div>
        <WinTextBox
          v-model:Text="input"
          PlaceholderText="在此输入文本…"
          AcceptsReturn
          TextWrapping="Wrap"
          Height="260" />
        <div class="stats-row">
          <span class="stat-item">字符 {{ stats.chars }}</span>
          <span class="stat-item">无空格 {{ stats.noSpace }}</span>
          <span class="stat-item">单词 {{ stats.words }}</span>
          <span class="stat-item">行数 {{ stats.lines }}</span>
          <span class="stat-item">中文 {{ stats.cjk }}</span>
        </div>
      </div>

      <div class="tb-card">
        <div class="tb-row">
          <p class="tb-title tb-grow">输出</p>
          <CopyButton :text="output" />
        </div>
        <WinTextBox
          v-model:Text="output"
          AcceptsReturn
          TextWrapping="Wrap"
          IsReadOnly
          Height="260"
          PlaceholderText="处理结果…" />
      </div>
    </div>

    <div class="tb-card">
      <p class="tb-title">转换</p>
      <div class="op-grid">
        <button v-for="op in caseOps" :key="op.label" type="button" class="tb-btn" @click="apply(op.fn)">{{ op.label }}</button>
      </div>
      <p class="tb-title">行操作</p>
      <div class="op-grid">
        <button v-for="op in lineOps" :key="op.label" type="button" class="tb-btn" @click="apply(op.fn)">{{ op.label }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import WinTextBox from "@/winui/components/WinTextBox.vue";
import CopyButton from "@/components/CopyButton.vue";

const input = ref("");
const output = ref("");

const stats = computed(() => {
  const s = input.value;
  const lines = s ? s.split(/\r\n|\r|\n/) : [];
  return {
    chars: [...s].length,
    noSpace: [...s.replace(/\s/g, "")].length,
    words: s.trim() ? s.trim().split(/\s+/).length : 0,
    lines: lines.length,
    cjk: (s.match(/[一-龥]/g) ?? []).length,
  };
});

function apply(fn: (s: string) => string) {
  output.value = fn(input.value);
}

const caseOps: { label: string; fn: (s: string) => string }[] = [
  { label: "全部大写", fn: (s) => s.toUpperCase() },
  { label: "全部小写", fn: (s) => s.toLowerCase() },
  { label: "首字母大写", fn: (s) => s.replace(/(^|\s)([a-zA-Z])/g, (m, p1, p2) => p1 + p2.toUpperCase()) },
  { label: "句子首字母大写", fn: (s) => s.replace(/([.!?。！？]\s*|\n|^)([a-zA-Z])/g, (m, p1, p2) => p1 + p2.toUpperCase()) },
  { label: "去除行首尾空格", fn: (s) => s.split(/\r\n|\r|\n/).map((l) => l.trim()).join("\n") },
  { label: "压缩多余空格", fn: (s) => s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n") },
];

const lineOps: { label: string; fn: (s: string) => string }[] = [
  { label: "删除空行", fn: (s) => s.split(/\r\n|\r|\n/).filter((l) => l.trim() !== "").join("\n") },
  { label: "按行排序", fn: (s) => s.split(/\r\n|\r|\n/).sort((a, b) => a.localeCompare(b, "zh")).join("\n") },
  { label: "去重行（保持顺序）", fn: (s) => { const seen = new Set<string>(); return s.split(/\r\n|\r|\n/).filter((l) => (seen.has(l) ? false : (seen.add(l), true))).join("\n"); } },
  { label: "倒序行", fn: (s) => s.split(/\r\n|\r|\n/).reverse().join("\n") },
  { label: "反转字符", fn: (s) => [...s].reverse().join("") },
  { label: "交换大小写", fn: (s) => [...s].map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join("") },
];
</script>

<style scoped>
.stats-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
  font-size: 12px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}

.stat-item {
  background: var(--ctrl-fill-secondary, rgba(249, 249, 249, 0.5));
  border-radius: 4px;
  padding: 2px 8px;
}

.op-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 6px;
}
</style>
