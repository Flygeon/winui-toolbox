<template>
  <div class="tb-section diff-tool">
    <div class="tb-two-col">
      <div class="tb-card">
        <p class="tb-title">原文（A）</p>
        <WinTextBox
          v-model:Text="textA"
          PlaceholderText="粘贴第一份文本…"
          AcceptsReturn
          TextWrapping="Wrap"
          Height="180" />
      </div>
      <div class="tb-card">
        <p class="tb-title">对比文（B）</p>
        <WinTextBox
          v-model:Text="textB"
          PlaceholderText="粘贴第二份文本…"
          AcceptsReturn
          TextWrapping="Wrap"
          Height="180" />
      </div>
    </div>

    <div class="tb-card">
      <div class="tb-row">
        <p class="tb-title tb-grow">差异结果</p>
        <span class="tb-hint">{{ summary }}</span>
        <button type="button" class="tb-btn" @click="copyText">复制文本版差异</button>
      </div>

      <div v-if="rows.length" class="diff-view">
        <table class="diff-table">
          <thead>
            <tr>
              <th class="diff-head diff-head-a">原文（A）</th>
              <th class="diff-head diff-head-b">对比文（B）</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in rows" :key="idx">
              <td class="diff-cell" :class="row.a ? `diff-${row.a.type}` : 'diff-empty'">
                <span class="diff-sign">{{ signOf(row.a) }}</span>
                <span class="diff-text">{{ row.a?.text ?? "" }}</span>
              </td>
              <td class="diff-cell" :class="row.b ? `diff-${row.b.type}` : 'diff-empty'">
                <span class="diff-sign">{{ signOf(row.b) }}</span>
                <span class="diff-text">{{ row.b?.text ?? "" }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else-if="textA || textB" class="tb-hint">两文完全一致，无差异。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import WinTextBox from "@/winui/components/WinTextBox.vue";
import { diffLines, diffToRows, diffToText, type DiffRow } from "@/utils/diff";
import { writeClipboard } from "@/utils/clipboard";

const textA = ref("");
const textB = ref("");

const rows = computed<DiffRow[]>(() => diffToRows(diffLines(textA.value, textB.value)));

const stats = computed(() => {
  const parts = diffLines(textA.value, textB.value);
  return {
    add: parts.filter((p) => p.op === "add").length,
    remove: parts.filter((p) => p.op === "remove").length,
  };
});

const summary = computed(() => {
  if (!textA.value && !textB.value) return "";
  return `新增 ${stats.value.add} 行 · 删除 ${stats.value.remove} 行`;
});

function signOf(cell: { type: string } | null): string {
  if (!cell) return "";
  return cell.type === "add" ? "+" : cell.type === "remove" ? "−" : " ";
}

async function copyText() {
  await writeClipboard(diffToText(diffLines(textA.value, textB.value)));
}
</script>

<style scoped>
.diff-view {
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  border-radius: 6px;
  overflow: hidden;
  max-height: 480px;
  overflow-y: auto;
}

.diff-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 13px;
  font-family: "Cascadia Mono", "Consolas", monospace;
}

.diff-head {
  position: sticky;
  top: 0;
  background: var(--ctrl-fill-secondary, rgba(249, 249, 249, 0.9));
  text-align: left;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
  font-weight: 600;
  border-bottom: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  z-index: 1;
}

.diff-head-a {
  border-right: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
}

.diff-head-b {
  border-left: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
}

.diff-cell {
  vertical-align: top;
  padding: 2px 8px;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
  border-bottom: 1px solid transparent;
  width: 50%;
}

.diff-head-a + .diff-cell,
.diff-cell + .diff-cell {
  border-left: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
}

.diff-equal {
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
}

.diff-remove {
  background: color-mix(in srgb, #c42b1c 12%, transparent);
}

.diff-add {
  background: color-mix(in srgb, #0f7b0f 12%, transparent);
}

.diff-empty {
  background: var(--card-bg-secondary, rgba(246, 246, 246, 0.3));
}

.diff-sign {
  display: inline-block;
  width: 14px;
  text-align: center;
  user-select: none;
  color: var(--text-tertiary, rgba(0, 0, 0, 0.4458));
}
</style>
