<template>
  <div class="tb-section regex-tool">
    <div class="tb-card">
      <div class="tb-row">
        <WinTextBox v-model:Text="pattern" PlaceholderText="输入正则表达式，例如 \d{3}-\d{4}" class="tb-grow" Height="38" />
        <WinTextBox v-model:Text="flags" PlaceholderText="标志 gimsu" class="flags-input" Height="38" />
      </div>
      <div class="tb-row">
        <span class="tb-hint">常用正则：</span>
        <button v-for="p in presets" :key="p.label" type="button" class="tb-chip" @click="pattern = p.pattern">{{ p.label }}</button>
      </div>
      <p v-if="regexError" class="tb-error">{{ regexError }}</p>
    </div>

    <div class="tb-card">
      <p class="tb-title">测试文本</p>
      <WinTextBox
        v-model:Text="text"
        PlaceholderText="在此输入要匹配的文本…"
        AcceptsReturn
        TextWrapping="Wrap"
        Height="180" />
      <p class="tb-hint">共 {{ matches.length }} 处匹配</p>
      <!-- 高亮预览 -->
      <div v-if="matches.length" class="regex-preview" v-html="highlightHtml"></div>
      <div v-else class="tb-output regex-none">无匹配结果。</div>
    </div>

    <div v-if="matches.length" class="tb-card">
      <p class="tb-title">匹配列表</p>
      <div class="match-list">
        <div v-for="(mt, i) in matches" :key="i" class="match-item">
          <span class="match-index">{{ i + 1 }}.</span>
          <span class="match-pos">@{{ mt.index }}</span>
          <code class="match-text">{{ mt.text }}</code>
          <span v-if="mt.groups.length" class="match-groups">
            {{ mt.groups.map((g, gi) => `$${gi + 1}=${g ?? "(未匹配)"}`).join("  ") }}
          </span>
        </div>
      </div>
    </div>

    <div class="tb-card">
      <div class="tb-row">
        <p class="tb-title tb-grow">查找替换</p>
        <button type="button" class="tb-btn tb-btn-primary" @click="replaceAll">全部替换</button>
        <CopyButton :text="replaceResult" />
      </div>
      <WinTextBox
        v-model:Text="replacement"
        PlaceholderText="替换为…（可用 $1、$2 引用捕获组）"
        Height="38" />
      <div v-if="replaceResult" class="tb-output">{{ replaceResult }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import WinTextBox from "@/winui/components/WinTextBox.vue";
import CopyButton from "@/components/CopyButton.vue";

const pattern = ref("");
const flags = ref("gi");
const text = ref("");
const replacement = ref("");
const replaceResult = ref("");

const regexError = ref("");
interface RegexMatch {
  text: string;
  index: number;
  groups: string[];
}
const matches = ref<RegexMatch[]>([]);
const highlightHtml = ref("");

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
}

const presets = [
  { label: "邮箱", pattern: "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}" },
  { label: "手机号", pattern: "1[3-9]\\d{9}" },
  { label: "IPv4", pattern: "(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}" },
  { label: "URL", pattern: "https?://[^\\s]+" },
  { label: "日期", pattern: "\\d{4}-\\d{2}-\\d{2}" },
  { label: "中文", pattern: "[\\u4e00-\\u9fa5]+" },
  { label: "HTML 标签", pattern: "<[^>]+>" },
];

function run() {
  regexError.value = "";
  matches.value = [];
  if (!pattern.value) {
    highlightHtml.value = escapeHtml(text.value);
    return;
  }
  let re: RegExp;
  try {
    re = new RegExp(pattern.value, flags.value);
  } catch (e) {
    regexError.value = `正则无效：${(e as Error).message}`;
    highlightHtml.value = escapeHtml(text.value);
    return;
  }
  const hasG = flags.value.includes("g");
  const listFlags = hasG ? flags.value : flags.value + "g";
  const listRe = new RegExp(pattern.value, listFlags);

  const marks: { start: number; end: number }[] = [];
  const MAX = 10000;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = listRe.exec(text.value)) !== null && count < MAX) {
    if (m[0] === "") listRe.lastIndex++; // 零宽匹配推进，防死循环
    matches.value.push({ text: m[0], index: m.index, groups: m.slice(1) });
    marks.push({ start: m.index, end: m.index + m[0].length });
    count++;
    if (!hasG) break;
  }
  if (count >= MAX) regexError.value = "匹配数量过多，已截断。";

  // 合并重叠区间（保留最早开始者），避免嵌套 <mark>
  marks.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const mk of marks) {
    const last = merged[merged.length - 1];
    if (last && mk.start < last.end) continue;
    merged.push(mk);
  }

  const src = text.value;
  let html = "";
  let cursor = 0;
  for (const mk of merged) {
    html += escapeHtml(src.slice(cursor, mk.start));
    html += `<mark>${escapeHtml(src.slice(mk.start, mk.end))}</mark>`;
    cursor = mk.end;
  }
  html += escapeHtml(src.slice(cursor));
  highlightHtml.value = html;
}

// 防抖，输入即匹配
let timer: ReturnType<typeof setTimeout> | null = null;
function scheduleRun() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(run, 120);
}

watch([pattern, flags, text], scheduleRun);

function replaceAll() {
  if (!pattern.value) {
    replaceResult.value = text.value;
    return;
  }
  try {
    const hasG = flags.value.includes("g");
    const re = new RegExp(pattern.value, hasG ? flags.value : flags.value + "g");
    replaceResult.value = text.value.replace(re, replacement.value);
  } catch (e) {
    replaceResult.value = `替换失败：${(e as Error).message}`;
  }
}
</script>

<style scoped>
.flags-input {
  width: 120px;
  flex: none;
}

.regex-preview {
  background: var(--card-bg-secondary, rgba(246, 246, 246, 0.5));
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
  max-height: 240px;
  overflow: auto;
}

.regex-preview :deep(mark) {
  background: color-mix(in srgb, var(--accent-base, #0067c0) 28%, transparent);
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
  border-radius: 2px;
  padding: 0 1px;
}

.regex-none {
  text-align: center;
  color: var(--text-tertiary, rgba(0, 0, 0, 0.4458));
}

.match-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 260px;
  overflow: auto;
}

.match-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
}

.match-index {
  flex: none;
  width: 22px;
  text-align: right;
  color: var(--text-tertiary, rgba(0, 0, 0, 0.4458));
  font-size: 12px;
}

.match-pos {
  flex: none;
  color: var(--text-tertiary, rgba(0, 0, 0, 0.4458));
  font-size: 12px;
  font-family: "Cascadia Mono", "Consolas", monospace;
}

.match-text {
  flex: none;
  background: var(--ctrl-fill-secondary, rgba(249, 249, 249, 0.5));
  border-radius: 4px;
  padding: 1px 6px;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
}

.match-groups {
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
  font-size: 12px;
  font-family: "Cascadia Mono", "Consolas", monospace;
  word-break: break-all;
}
</style>
