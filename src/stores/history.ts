import { ref } from "vue";
import { defineStore } from "pinia";
import { load } from "@tauri-apps/plugin-store";

const MAX_RECENT = 10;

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/**
 * 工具使用历史：收藏 + 最近使用。
 * 通过 tauri-plugin-store 持久化到 history.json，非 Tauri 环境降级到 localStorage。
 */
export const useHistoryStore = defineStore("history", () => {
  const favorites = ref<string[]>([]);
  const recent = ref<string[]>([]);
  const lastTool = ref<string | null>(null);

  let store: Awaited<ReturnType<typeof load>> | null = null;
  let initPromise: Promise<void> | null = null;

  async function persist() {
    if (store) {
      try {
        await store.set("favorites", favorites.value);
        await store.set("recent", recent.value);
        await store.set("lastTool", lastTool.value);
      } catch {
        /* 忽略 */
      }
    } else {
      try {
        localStorage.setItem(
          "toolbox.history",
          JSON.stringify({ favorites: favorites.value, recent: recent.value, lastTool: lastTool.value })
        );
      } catch {
        /* 忽略 */
      }
    }
  }

  /** 幂等且可并发的初始化：返回同一个 Promise，避免并发调用竞争 */
  function init(): Promise<void> {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      try {
        store = await load("history.json", { autoSave: true });
        favorites.value = asStringArray(await store.get<string[]>("favorites"));
        recent.value = asStringArray(await store.get<string[]>("recent"));
        const lt = await store.get<string | null>("lastTool");
        if (typeof lt === "string") lastTool.value = lt;
      } catch {
        store = null;
        try {
          const raw = localStorage.getItem("toolbox.history");
          if (raw) {
            const data = JSON.parse(raw) as { favorites?: unknown; recent?: unknown; lastTool?: unknown };
            favorites.value = asStringArray(data.favorites);
            recent.value = asStringArray(data.recent);
            if (typeof data.lastTool === "string") lastTool.value = data.lastTool;
          }
        } catch {
          /* 忽略 */
        }
      }
    })();
    return initPromise;
  }

  function isFavorite(id: string): boolean {
    return favorites.value.includes(id);
  }

  async function toggleFavorite(id: string) {
    if (isFavorite(id)) {
      favorites.value = favorites.value.filter((x) => x !== id);
    } else {
      favorites.value = [id, ...favorites.value];
    }
    await persist();
  }

  /** 记录一次工具访问，最近使用去重并限制条数，同时记录最后使用的工具 */
  async function addRecent(id: string) {
    recent.value = [id, ...recent.value.filter((x) => x !== id)].slice(0, MAX_RECENT);
    lastTool.value = id;
    await persist();
  }

  return {
    favorites,
    recent,
    lastTool,
    init,
    isFavorite,
    toggleFavorite,
    addRecent,
  };
});
