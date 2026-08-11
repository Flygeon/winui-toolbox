/**
 * 写入剪贴板，优先 navigator.clipboard，失败时降级为隐藏 textarea + execCommand。
 * Tauri v2 的 WebView 使用 http://tauri.localhost 协议（属于 secure context），
 * 正常情况下 navigator.clipboard 可用；降级路径保证任何环境都能复制。
 */
export async function writeClipboard(text: string): Promise<boolean> {
  if (text === "") return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* 继续走降级路径 */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
