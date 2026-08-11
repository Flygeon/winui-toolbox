<template>
  <div class="tb-section json-tool">
    <div class="tb-two-col">
      <div class="tb-card">
        <div class="tb-row">
          <p class="tb-title tb-grow">输入 JSON</p>
          <button type="button" class="tb-btn" @click="loadSample">示例</button>
          <button type="button" class="tb-btn" @click="input = ''">清空</button>
        </div>
        <WinTextBox
          v-model:Text="input"
          PlaceholderText='在此粘贴 JSON，例如 {"name":"工具箱","version":1}'
          AcceptsReturn
          TextWrapping="NoWrap"
          Height="320" />
      </div>

      <div class="tb-card">
        <div class="tb-row">
          <p class="tb-title tb-grow">输出</p>
          <CopyButton :text="output" />
        </div>
        <WinTextBox
          v-model:Text="output"
          AcceptsReturn
          TextWrapping="NoWrap"
          IsReadOnly
          Height="320" />
        <p v-if="error" class="tb-error">{{ error }}</p>
      </div>
    </div>

    <div class="tb-card">
      <div class="tb-row">
        <button type="button" class="tb-btn tb-btn-primary" @click="format(2)">格式化（2 空格）</button>
        <button type="button" class="tb-btn" @click="format(4)">格式化（4 空格）</button>
        <button type="button" class="tb-btn" @click="minify">压缩</button>
        <button type="button" class="tb-btn" @click="sortKeysAction">按键排序</button>
        <button type="button" class="tb-btn" @click="validate">校验</button>
      </div>
      <p v-if="stats" class="tb-hint">{{ stats }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import WinTextBox from "@/winui/components/WinTextBox.vue";
import CopyButton from "@/components/CopyButton.vue";

const input = ref("");
const output = ref("");
const error = ref("");
const stats = ref("");

function tryParse(): unknown {
  error.value = "";
  stats.value = "";
  try {
    return JSON.parse(input.value);
  } catch (e) {
    const msg = (e as Error).message;
    const m = msg.match(/position (\d+)/);
    let detail = msg;
    if (m) {
      const pos = Number(m[1]);
      const before = input.value.slice(0, pos);
      const line = before.split("\n").length;
      const col = pos - before.lastIndexOf("\n");
      detail = `${msg}\n（第 ${line} 行，第 ${col} 列附近）`;
    }
    error.value = detail;
    output.value = "";
    return undefined;
  }
}

function format(indent: number) {
  const value = tryParse();
  if (value === undefined) return;
  output.value = JSON.stringify(value, null, indent);
  updateStats();
}

function minify() {
  const value = tryParse();
  if (value === undefined) return;
  output.value = JSON.stringify(value);
  updateStats();
}

function sortKeysRecursive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysRecursive);
  if (value && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[k] = sortKeysRecursive((value as Record<string, unknown>)[k]);
    }
    return sorted;
  }
  return value;
}

function sortKeysAction() {
  const value = tryParse();
  if (value === undefined) return;
  output.value = JSON.stringify(sortKeysRecursive(value), null, 2);
  updateStats();
}

function validate() {
  const value = tryParse();
  if (value === undefined) return;
  const type = Array.isArray(value) ? "数组" : typeof value;
  stats.value = `JSON 有效：根类型 ${type}，顶层键 ${Object.keys(value as Record<string, unknown>).length} 个`;
}

function updateStats() {
  const bytes = new TextEncoder().encode(output.value).length;
  stats.value = `输出 ${output.value.length} 字符 / ${bytes} 字节（UTF-8）`;
}

function loadSample() {
  input.value = JSON.stringify(
    {
      name: "WinUI Toolbox",
      version: "0.1.0",
      modules: ["开发者工具", "办公与文档"],
      stats: { tools: 33, offline: true, tags: ["tauri", "vue"] },
    },
    null,
    2
  );
  format(2);
}
</script>
