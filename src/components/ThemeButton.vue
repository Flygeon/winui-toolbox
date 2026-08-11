<template>
  <button
    type="button"
    class="theme-button"
    :title="themeLabel"
    @click="settings.cycleTheme()">
    <span class="theme-button-glyph" aria-hidden="true">{{ resolvedGlyph }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useSettingsStore } from "@/stores/settings";

const settings = useSettingsStore();

const resolvedGlyph = computed(() => {
  if (settings.resolvedTheme === "dark") return ""; // 月亮
  return ""; // 太阳
});

const themeLabel = computed(() => {
  const map = { light: "浅色", dark: "深色", system: "跟随系统" };
  return `主题：${map[settings.themeMode]}（点击切换）`;
});
</script>

<style scoped>
.theme-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
  cursor: pointer;
  outline: none;
}

.theme-button:hover {
  background: var(--ctrl-fill-hover, rgba(0, 0, 0, 0.04));
}

.theme-button:active {
  background: var(--ctrl-fill-pressed, rgba(0, 0, 0, 0.06));
}

.theme-button-glyph {
  font-family: "WinUIOnWebIcons", "Segoe Fluent Icons", "Segoe MDL2 Assets", sans-serif;
  font-size: 16px;
  line-height: 1;
}
</style>
