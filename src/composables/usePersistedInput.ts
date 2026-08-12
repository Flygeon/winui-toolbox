import { ref, watch, type Ref } from "vue";

/**
 * 持久化的 ref：值写入 localStorage（Tauri 的 WebView2 会持久化），
 * 用于「记住工具输入」，刷新/重启应用后仍然保留。
 */
export function usePersistedInput(key: string, initial = ""): Ref<string> {
  const storageKey = `toolbox.input.${key}`;
  let start = initial;
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved !== null) start = saved;
  } catch {
    /* 忽略 */
  }
  const value = ref(start);
  watch(value, (v) => {
    try {
      localStorage.setItem(storageKey, v);
    } catch {
      /* 忽略 */
    }
  });
  return value;
}
