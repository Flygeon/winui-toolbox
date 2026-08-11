import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { load } from "@tauri-apps/plugin-store";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const SYSTEM_QUERY: MediaQueryList | null =
  typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;

/**
 * 全局设置：主题（浅色/深色/跟随系统）与侧边栏开合状态。
 * 通过 tauri-plugin-store 持久化到 settings.json，非 Tauri 环境降级到 localStorage。
 */
export const useSettingsStore = defineStore("settings", () => {
  const themeMode = ref<ThemeMode>("system");
  const paneOpen = ref(true);
  const initialized = ref(false);

  let store: Awaited<ReturnType<typeof load>> | null = null;

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
    if (store) {
      try {
        await store.set("theme", themeMode.value);
        await store.set("paneOpen", paneOpen.value);
      } catch {
        /* 忽略存储错误 */
      }
    } else {
      try {
        localStorage.setItem("toolbox.theme", themeMode.value);
        localStorage.setItem("toolbox.paneOpen", String(paneOpen.value));
      } catch {
        /* 忽略存储错误 */
      }
    }
  }

  async function init() {
    if (initialized.value) return;
    initialized.value = true;
    try {
      store = await load("settings.json", { autoSave: true });
      const t = await store.get<ThemeMode>("theme");
      if (t === "light" || t === "dark" || t === "system") themeMode.value = t;
      const po = await store.get<boolean>("paneOpen");
      if (typeof po === "boolean") paneOpen.value = po;
    } catch {
      store = null;
      const t = localStorage.getItem("toolbox.theme");
      if (t === "light" || t === "dark" || t === "system") themeMode.value = t;
      const po = localStorage.getItem("toolbox.paneOpen");
      if (po === "true" || po === "false") paneOpen.value = po === "true";
    }
    applyTheme();
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
    resolvedTheme,
    initialized,
    init,
    applyTheme,
    setThemeMode,
    setPaneOpen,
    cycleTheme,
  };
});
