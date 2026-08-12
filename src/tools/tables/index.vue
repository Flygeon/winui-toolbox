<template>
  <div class="tb-section tables-tool">
    <div class="tb-card">
      <div class="tb-row">
        <div class="nb-segmented" role="tablist" aria-label="转换模式">
          <button
            v-for="m in modes"
            :key="m.value"
            type="button"
            class="nb-segmented-item"
            :class="{ 'is-active': mode === m.value }"
            @click="mode = m.value">
            {{ m.label }}
          </button>
        </div>
        <label class="tb-hint">CSV 分隔符：
          <select v-model="delimiter" class="nb-select nb-select-sm">
            <option value=",">逗号</option>
            <option value="\t">制表符</option>
            <option value=";">分号</option>
          </select>
        </label>
      </div>
      <p v-if="error" class="tb-error">{{ error }}</p>
    </div>

    <div class="tb-two-col">
      <div class="tb-card">
        <div class="tb-row">
          <p class="tb-title tb-grow">{{ inputTitle }}</p>
          <button type="button" class="tb-btn" @click="loadSample">示例</button>
          <button type="button" class="tb-btn" @click="input = ''">清空</button>
        </div>
        <WinTextBox
          v-model:Text="input"
          :PlaceholderText="inputTitle"
          AcceptsReturn
          TextWrapping="NoWrap"
          Height="240" />
      </div>

      <div class="tb-card">
        <div class="tb-row">
          <p class="tb-title tb-grow">{{ outputTitle }}</p>
          <CopyButton :text="output" />
          <button type="button" class="tb-btn" @click="downloadOutput">下载</button>
        </div>
        <WinTextBox
          v-model:Text="output"
          AcceptsReturn
          TextWrapping="NoWrap"
          IsReadOnly
          Height="240"
          PlaceholderText="转换结果…" />
      </div>
    </div>

    <div class="tb-card">
      <p class="tb-title">表格预览（{{ previewRows.length - 1 }} 行数据）</p>
      <div v-if="previewRows.length" class="table-preview-wrap">
        <table class="table-preview">
          <thead v-if="previewRows.length > 1">
            <tr><th v-for="(c, i) in previewRows[0]" :key="i">{{ c }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="(r, ri) in previewRows.slice(1)" :key="ri">
              <td v-for="(c, ci) in r" :key="ci">{{ c }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="tb-hint">输入内容后将显示解析结果。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import WinTextBox from "@/winui/components/WinTextBox.vue";
import CopyButton from "@/components/CopyButton.vue";
import { downloadText } from "@/utils/download";
import { parseCsv, toCsv, parseMdTable, toMdTable } from "@/utils/csv";
import { usePersistedInput } from "@/composables/usePersistedInput";

type Mode = "csv-json" | "json-csv" | "csv-md" | "md-csv" | "json-md";

const modes: { value: Mode; label: string }[] = [
  { value: "csv-json", label: "CSV → JSON" },
  { value: "json-csv", label: "JSON → CSV" },
  { value: "csv-md", label: "CSV → Markdown" },
  { value: "md-csv", label: "Markdown → CSV" },
  { value: "json-md", label: "JSON → Markdown" },
];

const mode = ref<Mode>("csv-json");
const delimiter = ref(",");
const input = usePersistedInput("tables.input");
const output = ref("");
const error = ref("");
const previewRows = ref<string[][]>([]);

const inputTitle = computed(() => {
  const t: Record<Mode, string> = {
    "csv-json": "CSV 数据",
    "json-csv": "JSON 数组",
    "csv-md": "CSV 数据",
    "md-csv": "Markdown 表格",
    "json-md": "JSON 数组",
  };
  return t[mode.value];
});

const outputTitle = computed(() => {
  const t: Record<Mode, string> = {
    "csv-json": "JSON 数组",
    "json-csv": "CSV 数据",
    "csv-md": "Markdown 表格",
    "md-csv": "CSV 数据",
    "json-md": "Markdown 表格",
  };
  return t[mode.value];
});

// ---- 转换 ----
function convert() {
  error.value = "";
  output.value = "";
  previewRows.value = [];
  const src = input.value.trim();
  if (!src) return;
  try {
    switch (mode.value) {
      case "csv-json": {
        const rows = parseCsv(src, delimiter.value);
        if (!rows.length) throw new Error("未解析到任何行");
        const headers = rows[0];
        const data = rows.slice(1).map((r) => {
          const obj: Record<string, unknown> = {};
          headers.forEach((h, i) => {
            obj[h || `列${i + 1}`] = tryNumber(r[i] ?? "");
          });
          return obj;
        });
        output.value = JSON.stringify(data, null, 2);
        previewRows.value = rows;
        break;
      }
      case "json-csv": {
        const data = JSON.parse(src);
        const arr = Array.isArray(data) ? data : [data];
        const rows: string[][] = arr.map((o) =>
          Object.values(o as Record<string, unknown>).map((v) => (v === null || v === undefined ? "" : String(v)))
        );
        const headers = Object.keys(arr[0] ?? {});
        const all = [headers, ...rows];
        output.value = toCsv(all, delimiter.value);
        previewRows.value = all;
        break;
      }
      case "csv-md": {
        const rows = parseCsv(src, delimiter.value);
        output.value = toMdTable(rows);
        previewRows.value = rows;
        break;
      }
      case "md-csv": {
        const rows = parseMdTable(src);
        output.value = toCsv(rows, delimiter.value);
        previewRows.value = rows;
        break;
      }
      case "json-md": {
        const data = JSON.parse(src);
        const arr = Array.isArray(data) ? data : [data];
        const headers = Object.keys(arr[0] ?? {});
        const rows = [headers, ...arr.map((o) => headers.map((h) => String((o as Record<string, unknown>)[h] ?? "")))];
        output.value = toMdTable(rows);
        previewRows.value = rows;
        break;
      }
    }
  } catch (e) {
    error.value = `转换失败：${(e as Error).message}`;
  }
}

function tryNumber(v: string): string | number {
  if (v === "") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

function downloadOutput() {
  if (!output.value) return;
  const ext = mode.value.includes("csv") ? "csv" : mode.value.includes("json") ? "json" : "md";
  downloadText(output.value, `table.${ext}`);
}

let timer: ReturnType<typeof setTimeout> | null = null;
function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(convert, 120);
}
watch([mode, delimiter, input], schedule);

function loadSample() {
  if (mode.value === "csv-json" || mode.value === "csv-md") {
    input.value = '名称,模块,状态\n时间戳转换,开发者工具,已完成\nPDF 工具集,办公与文档,已完成';
  } else if (mode.value === "json-csv" || mode.value === "json-md") {
    input.value = JSON.stringify(
      [
        { 名称: "时间戳转换", 模块: "开发者工具", 状态: "已完成" },
        { 名称: "PDF 工具集", 模块: "办公与文档", 状态: "已完成" },
      ],
      null,
      2
    );
  } else {
    input.value = "| 名称 | 模块 | 状态 |\n| --- | --- | --- |\n| 时间戳转换 | 开发者工具 | 已完成 |\n| PDF 工具集 | 办公与文档 | 已完成 |";
  }
}
</script>

<style scoped>
.nb-select-sm {
  height: 26px;
  font-size: 12px;
  padding: 0 6px;
}

.table-preview-wrap {
  overflow: auto;
  max-height: 260px;
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  border-radius: 6px;
}

.table-preview {
  border-collapse: collapse;
  font-size: 13px;
  width: 100%;
}

.table-preview th,
.table-preview td {
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.1));
  padding: 6px 12px;
  text-align: left;
  white-space: nowrap;
}

.table-preview th {
  background: var(--ctrl-fill-secondary, rgba(249, 249, 249, 0.5));
  font-weight: 600;
  position: sticky;
  top: 0;
}
</style>
