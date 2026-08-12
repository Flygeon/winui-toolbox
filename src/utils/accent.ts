import { invoke } from "@tauri-apps/api/core";

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * 读取 Windows 系统强调色并应用到应用主题（覆盖 --accent-base 等变量）。
 * 非 Tauri 环境或命令不可用时静默保留默认蓝色强调色。
 */
export async function applySystemAccent(): Promise<void> {
  const hasTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  if (!hasTauri) return;
  try {
    const hex = await invoke<string>("get_system_accent_color");
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
    const root = document.documentElement;
    root.style.setProperty("--accent-base", hex);
    root.style.setProperty("--accent-hover", hex);
    root.style.setProperty("--accent-pressed", hex);
    root.style.setProperty("--accent-aa-fill", hex);
    // 依据亮度选择前景文字颜色，保证对比度
    const text = luminance(hex) > 0.62 ? "#1a1a1a" : "#ffffff";
    root.style.setProperty("--accent-aa-text", text);
  } catch {
    /* 保留默认强调色 */
  }
}
