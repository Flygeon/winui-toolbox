<template>
  <div class="window-controls" @dblclick.stop @mousedown.stop>
    <button
      type="button"
      class="window-control"
      aria-label="最小化"
      title="最小化"
      @click="onMinimize">
      <span class="window-control-glyph" aria-hidden="true">&#xE921;</span>
    </button>
    <button
      type="button"
      class="window-control"
      :aria-label="isMaximized ? '还原' : '最大化'"
      :title="isMaximized ? '还原' : '最大化'"
      @click="onToggleMaximize">
      <span class="window-control-glyph" aria-hidden="true">{{ isMaximized ? "" : "" }}</span>
    </button>
    <button
      type="button"
      class="window-control window-control-close"
      aria-label="关闭"
      title="关闭"
      @click="onClose">
      <span class="window-control-glyph" aria-hidden="true">&#xE8BB;</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";

// 纯浏览器预览（npm run dev 无 Tauri）时降级为占位，避免 getCurrentWindow 抛错
const hasTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const appWindow = hasTauri ? getCurrentWindow() : null;
const isMaximized = ref(false);

async function refreshMaximized() {
  if (!appWindow) return;
  try {
    isMaximized.value = await appWindow.isMaximized();
  } catch {
    /* 非 Tauri 环境忽略 */
  }
}

async function onMinimize() {
  try {
    await appWindow?.minimize();
  } catch {
    /* 忽略 */
  }
}

async function onToggleMaximize() {
  try {
    await appWindow?.toggleMaximize();
    await refreshMaximized();
  } catch {
    /* 忽略 */
  }
}

async function onClose() {
  try {
    await appWindow?.close();
  } catch {
    /* 忽略 */
  }
}

let unlisten: (() => void) | null = null;

onMounted(async () => {
  if (!appWindow) return;
  await refreshMaximized();
  try {
    unlisten = await appWindow.onResized(refreshMaximized);
  } catch {
    /* 忽略 */
  }
});

onBeforeUnmount(() => {
  unlisten?.();
});
</script>

<style scoped>
.window-controls {
  display: flex;
  align-items: stretch;
  height: 100%;
}

.window-control {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
  cursor: default;
  outline: none;
  font-size: 10px;
}

.window-control:hover {
  background: var(--ctrl-fill-hover, rgba(0, 0, 0, 0.04));
}

.window-control:active {
  background: var(--ctrl-fill-pressed, rgba(0, 0, 0, 0.06));
}

.window-control-close:hover {
  background: #c42b1c;
  color: #ffffff;
}

.window-control-close:active {
  background: #a8281a;
  color: #ffffff;
}

.window-control-glyph {
  font-family: "WinUIOnWebIcons", "Segoe Fluent Icons", "Segoe MDL2 Assets", sans-serif;
  font-size: 10px;
  line-height: 1;
}
</style>
