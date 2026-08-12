<template>
  <div v-if="path" class="downloaded-bar">
    <span class="downloaded-check" aria-hidden="true">✓</span>
    <span class="downloaded-path" :title="path">已保存：{{ path }}</span>
    <div class="downloaded-actions">
      <button type="button" class="tb-btn tb-btn-mini" @click="openFolder">打开目录</button>
      <button type="button" class="tb-btn tb-btn-mini" @click="copyPath">复制路径</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { openPath } from "@tauri-apps/plugin-opener";
import { dirOf } from "@/utils/file-save";
import { writeClipboard } from "@/utils/clipboard";

const props = defineProps<{ path: string | null }>();

async function openFolder() {
  if (!props.path) return;
  try {
    await openPath(dirOf(props.path));
  } catch {
    /* 忽略 */
  }
}

async function copyPath() {
  if (!props.path) return;
  await writeClipboard(props.path);
}
</script>

<style scoped>
.downloaded-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 6px;
  background: color-mix(in srgb, #0f7b0f 10%, transparent);
  border: 1px solid color-mix(in srgb, #0f7b0f 30%, transparent);
  font-size: 13px;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
  flex-wrap: wrap;
}

.downloaded-check {
  flex: none;
  color: #0f7b0f;
  font-weight: 600;
}

.downloaded-path {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.downloaded-actions {
  flex: none;
  display: flex;
  gap: 8px;
}

.tb-btn-mini {
  height: 24px;
  padding: 0 10px;
  font-size: 12px;
}
</style>
