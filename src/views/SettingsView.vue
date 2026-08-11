<template>
  <div class="settings-view">
    <header class="tool-view-header">
      <h1 class="tool-view-title">设置</h1>
      <p class="tool-view-desc">个性化与关于</p>
    </header>

    <div class="settings-body">
      <section class="settings-section">
        <h2 class="settings-section-title">外观</h2>

        <div class="settings-row">
          <div class="settings-row-label">
            <span class="settings-row-name">主题</span>
            <span class="settings-row-hint">浅色 / 深色 / 跟随系统</span>
          </div>
          <div class="theme-segmented" role="radiogroup" aria-label="主题">
            <button
              v-for="m in modes"
              :key="m.value"
              type="button"
              class="theme-segmented-item"
              :class="{ 'is-active': settings.themeMode === m.value }"
              role="radio"
              :aria-checked="settings.themeMode === m.value"
              @click="settings.setThemeMode(m.value)">
              {{ m.label }}
            </button>
          </div>
        </div>

        <div class="settings-row">
          <div class="settings-row-label">
            <span class="settings-row-name">始终展开侧边栏</span>
            <span class="settings-row-hint">开启后侧边栏常驻展开，切换工具不会收起</span>
          </div>
          <WinToggleSwitch
            :IsOn="settings.sidebarAlwaysExpanded"
            OnContent="开"
            OffContent="关"
            @update:IsOn="settings.setSidebarAlwaysExpanded($event)" />
        </div>
      </section>

      <section class="settings-section">
        <h2 class="settings-section-title">个性化</h2>

        <div class="settings-row">
          <div class="settings-row-label">
            <span class="settings-row-name">记住最后使用的工具</span>
            <span class="settings-row-hint">启动时自动打开上次使用的工具</span>
          </div>
          <WinToggleSwitch
            :IsOn="settings.resumeLastTool"
            OnContent="开"
            OffContent="关"
            @update:IsOn="settings.setResumeLastTool($event)" />
        </div>

        <div class="settings-row">
          <div class="settings-row-label">
            <span class="settings-row-name">记忆窗口尺寸与位置</span>
            <span class="settings-row-hint">关闭后恢复默认窗口大小与位置</span>
          </div>
          <WinToggleSwitch
            :IsOn="settings.rememberWindow"
            OnContent="开"
            OffContent="关"
            @update:IsOn="settings.setRememberWindow($event)" />
        </div>
      </section>

      <section class="settings-section">
        <h2 class="settings-section-title">关于</h2>
        <p class="settings-about-name">WinUI Toolbox v{{ appVersion }}</p>
        <p class="settings-about-sub">本地优先 · 离线可用 · 数据不出设备</p>
        <p class="settings-about-tech">基于 Tauri 2 · Vue 3 · TypeScript · WinUIonWeb</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore, type ThemeMode } from "@/stores/settings";
import WinToggleSwitch from "@/winui/components/WinToggleSwitch.vue";

const settings = useSettingsStore();

const appVersion = "0.1.0";

const modes: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
  { value: "system", label: "跟随系统" },
];
</script>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.settings-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0 28px 28px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 720px;
}

.settings-section {
  background: var(--card-bg, rgba(255, 255, 255, 0.7));
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  border-radius: 8px;
  padding: 18px 20px;
}

.settings-section-title {
  margin: 0 0 14px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 10px 0;
}

.settings-row + .settings-row {
  border-top: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
}

.settings-row-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.settings-row-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
}

.settings-row-hint {
  font-size: 12px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}

.theme-segmented {
  display: inline-flex;
  padding: 2px;
  border-radius: 6px;
  background: var(--ctrl-fill-secondary, rgba(249, 249, 249, 0.5));
  border: 1px solid var(--ctrl-border, rgba(0, 0, 0, 0.06));
}

.theme-segmented-item {
  border: none;
  background: transparent;
  padding: 4px 14px;
  border-radius: 4px;
  font-family: inherit;
  font-size: 12px;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
  cursor: pointer;
  transition: background 120ms ease;
}

.theme-segmented-item:hover {
  background: var(--ctrl-fill-tertiary, rgba(249, 249, 249, 0.8));
}

.theme-segmented-item.is-active {
  background: var(--accent-aa-fill, #004e8c);
  color: var(--accent-aa-text, #ffffff);
}

.settings-about-name {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
}

.settings-about-sub,
.settings-about-tech {
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}
</style>
