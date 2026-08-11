<template>
  <button type="button" class="copy-button" :class="{ 'is-copied': copied }" :title="copied ? '已复制' : '复制'" @click="onCopy">
    <span class="copy-button-icon" aria-hidden="true">{{ copied ? "已复制" : "复制" }}</span>
  </button>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { writeClipboard } from "@/utils/clipboard";

const props = defineProps<{ text: string }>();

const copied = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;

async function onCopy() {
  const ok = await writeClipboard(props.text);
  if (ok) {
    copied.value = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => (copied.value = false), 1500);
  }
}
</script>

<style scoped>
.copy-button {
  flex: none;
  min-width: 60px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--ctrl-border, rgba(0, 0, 0, 0.06));
  border-radius: 4px;
  background: var(--ctrl-fill-secondary, rgba(249, 249, 249, 0.5));
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background 120ms ease;
}

.copy-button:hover {
  background: var(--ctrl-fill-tertiary, rgba(249, 249, 249, 0.8));
}

.copy-button:active {
  background: var(--ctrl-fill-default, rgba(255, 255, 255, 0.7));
}

.copy-button.is-copied {
  color: var(--accent-aa-text, #ffffff);
  background: var(--accent-aa-fill, #004e8c);
}

.copy-button-icon {
  font-size: 13px;
}
</style>
