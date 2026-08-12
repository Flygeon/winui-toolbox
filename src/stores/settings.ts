import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { load } from "@tauri-apps/plugin-store";
import { invoke } from "@tauri-apps/api/core";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const SYSTEM_QUERY: MediaQueryList | null =
  typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;

function readBool(v: unknown): boolean {
  return typeof v === "boolean" ? v : false;
}

/**
 * 全局设置：主题、侧边栏、窗口记忆等。
 * 通过 tauri-plugin-store 持久化到 settings.json，非 Tauri 环境降级到 localStorage。
 */
export const useSettingsStore = defineStore("settings", () => {
  const themeMode = ref<ThemeMode>("system");
  const paneOpen = ref(true);
  const sidebarAlwaysExpanded = ref(false);
  const rememberWindow = ref(true);
  const resumeLastTool = ref(false);
  const windowBounds = ref<{ x: number; y: number; width: number; height: number } | null>(null);
  const ffmpegPath = ref<string | null>(null);
  const ffmpegVersion = ref<string | null>(null);
  const minimizeToTray = ref(true);
  const downloadDir = ref<string | null>(null);
  let store: Awaited<ReturnType<typeof load>> | null = null;
  let initPromise: Promise<void> | null = null;

  const resolvedTheme = computed<ResolvedTheme>(() => {
    if (themeMode.value === "system") {
      return SYSTEM_QUERY?.matches ? "dark" : "light";
    }
    return themeMode.value;
  });

  function applyTheme() {
    const root = document.documentElement;
    root.classList.remove("theme-light", "theme-dark");
    root.classList.add(`theme-${resolvedTheme.value}`);
  }

  async function persist() {
    const values: Record<string, unknown> = {
      theme: themeMode.value,
      paneOpen: paneOpen.value,
      sidebarAlwaysExpanded: sidebarAlwaysExpanded.value,
      rememberWindow: rememberWindow.value,
      resumeLastTool: resumeLastTool.value,
      windowBounds: windowBounds.value,
      ffmpegPath: ffmpegPath.value,
      minimizeToTray: minimizeToTray.value,
      downloadDir: downloadDir.value,
    };
    if (store) {
      try {
        for (const [k, v] of Object.entries(values)) await store.set(k, v);
      } catch {
        /* 忽略存储错误 */
      }
    } else {
      try {
        for (const [k, v] of Object.entries(values)) {
          localStorage.setItem(`toolbox.${k}`, String(v));
        }
      } catch {
        /* 忽略存储错误 */
      }
    }
  }

  /** 幂等且可并发的初始化：返回同一个 Promise，避免 main.ts 与 App 并发调用竞争 */
  function init(): Promise<void> {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      try {
        store = await load("settings.json", { autoSave: true });
        const t = await store.get<ThemeMode>("theme");
        if (t === "light" || t === "dark" || t === "system") themeMode.value = t;
        paneOpen.value = readBool(await store.get<boolean>("paneOpen"));
        sidebarAlwaysExpanded.value = readBool(await store.get<boolean>("sidebarAlwaysExpanded"));
        rememberWindow.value = readBool(await store.get<boolean>("rememberWindow"));
        resumeLastTool.value = readBool(await store.get<boolean>("resumeLastTool"));
        const wb = await store.get<{ x: number; y: number; width: number; height: number } | null>("windowBounds");
        if (wb && typeof wb === "object" && [wb.x, wb.y, wb.width, wb.height].every((n) => typeof n === "number")) {
          windowBounds.value = wb;
        }
        const fp = await store.get<string | null>("ffmpegPath");
        if (typeof fp === "string") ffmpegPath.value = fp;
        minimizeToTray.value = readBool(await store.get<boolean>("minimizeToTray"));
        const dd = await store.get<string | null>("downloadDir");
        if (typeof dd === "string") downloadDir.value = dd;
      } catch {
        store = null;
        const t = localStorage.getItem("toolbox.theme");
        if (t === "light" || t === "dark" || t === "system") themeMode.value = t;
        paneOpen.value = localStorage.getItem("toolbox.paneOpen") === "true";
        sidebarAlwaysExpanded.value = localStorage.getItem("toolbox.sidebarAlwaysExpanded") === "true";
        rememberWindow.value = localStorage.getItem("toolbox.rememberWindow") !== "false";
        resumeLastTool.value = localStorage.getItem("toolbox.resumeLastTool") === "true";
        const fp = localStorage.getItem("toolbox.ffmpegPath");
        if (fp && fp !== "null") ffmpegPath.value = fp;
        minimizeToTray.value = localStorage.getItem("toolbox.minimizeToTray") !== "false";
        const dd = localStorage.getItem("toolbox.downloadDir");
        if (dd && dd !== "null") downloadDir.value = dd;
        try {
          const raw = localStorage.getItem("toolbox.windowBounds");
          if (raw) windowBounds.value = JSON.parse(raw);
        } catch {
          /* 忽略 */
        }
      }
      applyTheme();
    })();
    return initPromise;
  }

  async function setThemeMode(mode: ThemeMode) {
    themeMode.value = mode;
    applyTheme();
    await persist();
  }

  async function setPaneOpen(open: boolean) {
    paneOpen.value = open;
    await persist();
  }

  async function setSidebarAlwaysExpanded(v: boolean) {
    sidebarAlwaysExpanded.value = v;
    if (v) paneOpen.value = true; // 始终展开时强制展开
    await persist();
  }

  async function setRememberWindow(v: boolean) {
    rememberWindow.value = v;
    await persist();
  }

  async function setResumeLastTool(v: boolean) {
    resumeLastTool.value = v;
    await persist();
  }

  /** 记录用户选定的 FFmpeg 路径与版本 */
  async function setFfmpeg(path: string, version = "") {
    ffmpegPath.value = path;
    if (version) ffmpegVersion.value = version;
    await persist();
  }

  async function setFfmpegVersion(version: string) {
    ffmpegVersion.value = version;
  }

  async function clearFfmpeg() {
    ffmpegPath.value = null;
    ffmpegVersion.value = null;
    await persist();
  }

  async function setDownloadDir(path: string | null) {
    downloadDir.value = path;
    await persist();
  }

  /** 最小化到托盘：持久化 + 通知 Rust 端拦截关闭 */
  async function setMinimizeToTray(v: boolean) {
    minimizeToTray.value = v;
    await persist();
    try {
      await invoke("set_minimize_to_tray", { enabled: v });
    } catch {
      /* 非 Tauri 环境忽略 */
    }
  }

  async function saveWindowBounds(b: { x: number; y: number; width: number; height: number }) {
    windowBounds.value = b;
    await persist();
  }

  /** 循环切换 浅色 → 深色 → 跟随系统 */
  function cycleTheme() {
    const order: ThemeMode[] = ["light", "dark", "system"];
    const next = order[(order.indexOf(themeMode.value) + 1) % order.length];
    void setThemeMode(next);
  }

  if (SYSTEM_QUERY) {
    SYSTEM_QUERY.addEventListener("change", () => {
      if (themeMode.value === "system") applyTheme();
    });
  }

  return {
    themeMode,
    paneOpen,
    sidebarAlwaysExpanded,
    rememberWindow,
    resumeLastTool,
    windowBounds,
    ffmpegPath,
    ffmpegVersion,
    minimizeToTray,
    downloadDir,
    resolvedTheme,
    init,
    applyTheme,
    setThemeMode,
    setPaneOpen,
    setSidebarAlwaysExpanded,
    setRememberWindow,
    setResumeLastTool,
    setFfmpeg,
    setFfmpegVersion,
    clearFfmpeg,
    setDownloadDir,
    setMinimizeToTray,
    saveWindowBounds,
    cycleTheme,
  };
});
