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
        <h2 class="settings-section-title">FFmpeg（音视频工具）</h2>

        <div class="settings-row">
          <div class="settings-row-label">
            <span class="settings-row-name">状态</span>
            <span v-if="settings.ffmpegPath" class="settings-row-hint">已配置 · {{ settings.ffmpegVersion || "路径已设置" }}</span>
            <span v-else class="settings-row-hint">未配置，音视频转换工具暂不可用</span>
          </div>
        </div>

        <div v-if="settings.ffmpegPath" class="settings-row">
          <code class="settings-ffmpeg-path" :title="settings.ffmpegPath">{{ settings.ffmpegPath }}</code>
          <button type="button" class="tb-btn" @click="settings.clearFfmpeg()">清除</button>
        </div>

        <div class="settings-row">
          <div class="settings-row-label">
            <span class="settings-row-name">自动扫描 PATH</span>
            <span class="settings-row-hint">在系统 PATH 目录中查找 ffmpeg.exe</span>
          </div>
          <button type="button" class="tb-btn" :disabled="scanning" @click="scanFfmpeg">
            {{ scanning ? "扫描中…" : "扫描" }}
          </button>
        </div>

        <div class="settings-row">
          <div class="settings-row-label">
            <span class="settings-row-name">手动选择</span>
            <span class="settings-row-hint">选择本地 ffmpeg.exe 文件</span>
          </div>
          <button type="button" class="tb-btn tb-btn-primary" @click="pickFfmpeg">选择文件…</button>
        </div>

        <p v-if="!settings.ffmpegPath" class="settings-ffmpeg-download">
          未检测到 FFmpeg，可前往官网下载 Windows 全功能构建，或复制下载链接：
          <span class="settings-ffmpeg-url">{{ FFMPEG_DOWNLOAD_URL }}</span>
          <button type="button" class="tb-btn tb-btn-mini" @click="openDownload">打开下载页</button>
        </p>
      </section>

      <section class="settings-section">
        <h2 class="settings-section-title">系统</h2>

        <div class="settings-row">
          <div class="settings-row-label">
            <span class="settings-row-name">开机自启</span>
            <span class="settings-row-hint">登录 Windows 后自动启动工具箱</span>
          </div>
          <WinToggleSwitch
            :IsOn="autostartEnabled"
            OnContent="开"
            OffContent="关"
            @update:IsOn="toggleAutostart" />
        </div>

        <div class="settings-row">
          <div class="settings-row-label">
            <span class="settings-row-name">最小化到托盘</span>
            <span class="settings-row-hint">关闭窗口时隐藏到系统托盘而不是退出</span>
          </div>
          <WinToggleSwitch
            :IsOn="settings.minimizeToTray"
            OnContent="开"
            OffContent="关"
            @update:IsOn="settings.setMinimizeToTray($event)" />
        </div>

        <p class="settings-tray-hint">应用常驻系统托盘：左键点击图标显示主窗口，右键菜单可「显示主窗口 / 退出」。</p>
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
import { onMounted, ref } from "vue";
import { useSettingsStore, type ThemeMode } from "@/stores/settings";
import WinToggleSwitch from "@/winui/components/WinToggleSwitch.vue";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { isEnabled, enable, disable } from "@tauri-apps/plugin-autostart";
import { openUrl } from "@tauri-apps/plugin-opener";
import { FFMPEG_DOWNLOAD_URL, resolveFfmpeg } from "@/utils/ffmpeg";

const settings = useSettingsStore();

const hasTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const appVersion = "0.1.0";

const modes: { value: ThemeMode; label: string }[] = [
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
  { value: "system", label: "跟随系统" },
];

// ---- FFmpeg ----
const scanning = ref(false);

async function scanFfmpeg() {
  if (!hasTauri) return;
  scanning.value = true;
  try {
    await resolveFfmpeg();
  } finally {
    scanning.value = false;
  }
}

async function pickFfmpeg() {
  if (!hasTauri) return;
  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: "FFmpeg", extensions: ["exe"] }],
    });
    if (!selected) return;
    const path = selected as string;
    let version = "";
    try {
      version = await invoke<string>("get_ffmpeg_version", { path });
    } catch {
      version = "";
    }
    if (!version) {
      await settings.setFfmpeg(path, "（文件可执行，但未返回版本信息）");
    } else {
      await settings.setFfmpeg(path, version);
    }
  } catch {
    /* 忽略 */
  }
}

async function openDownload() {
  if (!hasTauri) return;
  try {
    await openUrl(FFMPEG_DOWNLOAD_URL);
  } catch {
    /* 忽略 */
  }
}

// ---- 开机自启 ----
const autostartEnabled = ref(false);

async function refreshAutostart() {
  if (!hasTauri) return;
  try {
    autostartEnabled.value = await isEnabled();
  } catch {
    autostartEnabled.value = false;
  }
}

async function toggleAutostart(v: boolean) {
  if (!hasTauri) return;
  try {
    if (v) await enable();
    else await disable();
    autostartEnabled.value = await isEnabled();
  } catch {
    autostartEnabled.value = false;
  }
}

onMounted(refreshAutostart);
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

.settings-ffmpeg-path {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: "Cascadia Mono", "Consolas", monospace;
  font-size: 12px;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
}

.settings-ffmpeg-download {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.8;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}

.settings-ffmpeg-url {
  display: block;
  font-family: "Cascadia Mono", "Consolas", monospace;
  font-size: 11px;
  color: var(--accent-base, #0067c0);
  word-break: break-all;
}

.tb-btn-mini {
  height: 24px;
  padding: 0 10px;
  font-size: 12px;
  margin-top: 6px;
}

.settings-tray-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--text-tertiary, rgba(0, 0, 0, 0.4458));
}
</style>
