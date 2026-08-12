<template>
  <div class="tb-section timestamp-tool">
    <div class="tb-card">
      <p class="tb-title">Unix 时间戳 → 日期时间</p>
      <div class="tb-row">
        <WinTextBox
          v-model:Text="unixInput"
          PlaceholderText="输入 Unix 秒（10 位）或毫秒（13 位），例如 1723353600"
          class="tb-grow"
          Height="38" />
        <button type="button" class="tb-btn tb-btn-primary" @click="parseUnix">转换</button>
        <button type="button" class="tb-btn" @click="useNow">使用当前时间</button>
      </div>
      <div v-if="unixResult" class="tb-output">{{ unixResult }}</div>
    </div>

    <div class="tb-card">
      <p class="tb-title">日期时间 → Unix 时间戳</p>
      <div class="tb-row">
        <input v-model="dateInput" type="datetime-local" class="datetime-input" />
        <button type="button" class="tb-btn tb-btn-primary" @click="parseDate">转换</button>
        <button type="button" class="tb-btn" @click="useNowDate">使用当前时间</button>
      </div>
      <div v-if="dateResult" class="tb-output">{{ dateResult }}</div>
    </div>

    <div class="tb-card">
      <p class="tb-title">常用时间戳</p>
      <div class="tb-row">
        <button v-for="t in quickPresets" :key="t.label" type="button" class="tb-chip" @click="applyQuick(t.ms)">
          {{ t.label }}
        </button>
      </div>
      <p class="tb-hint">提示：秒级时间戳为 10 位数字，毫秒级为 13 位；本工具会自动识别。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import WinTextBox from "@/winui/components/WinTextBox.vue";
import { usePersistedInput } from "@/composables/usePersistedInput";

const unixInput = usePersistedInput("timestamp.unix");
const unixResult = ref("");
const dateInput = usePersistedInput("timestamp.date");
const dateResult = ref("");

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDateTime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function parseUnix() {
  const raw = unixInput.value.trim();
  if (!raw) return;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    unixResult.value = "输入无效：无法解析为数字。";
    return;
  }
  // 13 位或更多按毫秒处理，否则按秒
  const ms = Math.abs(n) >= 1e12 ? n : n * 1000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) {
    unixResult.value = "输入无效：超出日期范围。";
    return;
  }
  unixResult.value = [
    `本地时间：${formatDateTime(d)}`,
    `UTC 时间：${formatDateTime(new Date(d.getTime() + d.getTimezoneOffset() * 60000))}`,
    `ISO 8601：${d.toISOString()}`,
    `Unix 秒：${Math.floor(d.getTime() / 1000)}`,
    `Unix 毫秒：${d.getTime()}`,
  ].join("\n");
}

function parseDate() {
  if (!dateInput.value) return;
  const d = new Date(dateInput.value); // datetime-local 按本地时区解析
  if (Number.isNaN(d.getTime())) {
    dateResult.value = "输入无效。";
    return;
  }
  dateResult.value = [
    `Unix 秒：${Math.floor(d.getTime() / 1000)}`,
    `Unix 毫秒：${d.getTime()}`,
    `ISO 8601：${d.toISOString()}`,
  ].join("\n");
}

function useNow() {
  unixInput.value = String(Math.floor(Date.now() / 1000));
  parseUnix();
}

function useNowDate() {
  const d = new Date();
  dateInput.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  parseDate();
}

function applyQuick(ms: number) {
  unixInput.value = String(Math.floor(ms / 1000));
  parseUnix();
}

function msAgo(minutes: number): number {
  return Date.now() - minutes * 60 * 1000;
}

const quickPresets = [
  { label: "现在", ms: Date.now() },
  { label: "5 分钟前", ms: msAgo(5) },
  { label: "1 小时前", ms: msAgo(60) },
  { label: "今天 00:00", ms: new Date().setHours(0, 0, 0, 0) },
  { label: "本周一", ms: (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); d.setHours(0, 0, 0, 0); return d.getTime(); })() },
  { label: "本月 1 号", ms: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() },
  { label: "今年 1 月 1 日", ms: new Date(new Date().getFullYear(), 0, 1).getTime() },
];
</script>
