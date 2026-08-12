<template>
  <div class="tb-section clipboard-tool">
    <div class="tb-card">
      <div class="tb-row">
        <p class="tb-title tb-grow">剪贴板历史</p>
        <span class="tb-hint">{{ items.length }} 条</span>
        <button type="button" class="tb-btn" :disabled="!items.length" @click="clearAll">清空</button>
      </div>
      <p class="tb-hint">自动监听剪贴板，点击条目即可重新复制；★ 可固定常用内容。剪贴板可能包含敏感信息，请自行注意。</p>
    </div>

    <div class="tb-card clip-list">
      <div v-for="item in ordered" :key="item.id" class="clip-item" :class="{ 'is-pinned': item.pinned }">
        <button type="button" class="clip-copy" :title="item.pinned ? '取消固定' : '固定'" @click="togglePin(item)">
          <span aria-hidden="true">{{ item.pinned ? "★" : "☆" }}</span>
        </button>
        <button type="button" class="clip-text" :title="item.text" @click="copyItem(item)">
          <span class="clip-preview">{{ item.text }}</span>
          <span class="clip-time">{{ timeOf(item.time) }}</span>
        </button>
        <button type="button" class="clip-del" title="删除" @click="removeItem(item)">×</button>
      </div>
      <p v-if="!items.length" class="tb-hint clip-empty">暂无记录，复制内容后将自动出现在这里。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";

interface ClipItem {
  id: string;
  text: string;
  pinned: boolean;
  time: number;
}

const MAX = 50;
const hasTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const items = ref<ClipItem[]>([]);
let last = "";

const ordered = computed(() => [...items.value].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.time - a.time));

function load() {
  try {
    const raw = localStorage.getItem("toolbox.clipboard");
    if (raw) items.value = JSON.parse(raw);
  } catch {
    /* 忽略 */
  }
}

function save() {
  try {
    localStorage.setItem("toolbox.clipboard", JSON.stringify(items.value));
  } catch {
    /* 忽略 */
  }
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function poll() {
  if (!hasTauri) return;
  try {
    const text = await readText();
    if (text && text !== last) {
      last = text;
      items.value = [{ id: genId(), text, pinned: false, time: Date.now() }, ...items.value.filter((i) => i.text !== text)].slice(0, MAX);
      save();
    }
  } catch {
    /* 忽略 */
  }
}

async function copyItem(item: ClipItem) {
  if (!hasTauri) return;
  try {
    await writeText(item.text);
    last = item.text;
  } catch {
    /* 忽略 */
  }
}

function togglePin(item: ClipItem) {
  item.pinned = !item.pinned;
  save();
}

function removeItem(item: ClipItem) {
  items.value = items.value.filter((i) => i.id !== item.id);
  save();
}

function clearAll() {
  items.value = [];
  save();
}

function timeOf(t: number): string {
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  load();
  void poll();
  if (hasTauri) timer = setInterval(() => void poll(), 1200);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.clip-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 520px;
  overflow-y: auto;
}

.clip-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  background: var(--card-bg-secondary, rgba(246, 246, 246, 0.4));
}

.clip-item.is-pinned {
  border-color: color-mix(in srgb, #e8a33d 50%, transparent);
}

.clip-copy {
  flex: none;
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  border-radius: 5px;
  cursor: pointer;
  color: var(--text-tertiary, rgba(0, 0, 0, 0.4458));
  font-size: 14px;
}

.clip-copy:hover {
  background: var(--subtle-secondary, rgba(0, 0, 0, 0.06));
}

.clip-item.is-pinned .clip-copy {
  color: #e8a33d;
}

.clip-text {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  border: none;
  background: transparent;
  padding: 2px 0;
  cursor: pointer;
  text-align: left;
}

.clip-preview {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
}

.clip-time {
  flex: none;
  font-size: 11px;
  color: var(--text-tertiary, rgba(0, 0, 0, 0.4458));
}

.clip-del {
  flex: none;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 5px;
  cursor: pointer;
  color: var(--text-tertiary, rgba(0, 0, 0, 0.4458));
  font-size: 15px;
}

.clip-del:hover {
  background: color-mix(in srgb, #c42b1c 15%, transparent);
  color: #c42b1c;
}

.clip-empty {
  text-align: center;
  padding: 24px;
}
</style>
