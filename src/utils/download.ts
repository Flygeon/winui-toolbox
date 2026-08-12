/** 下载二进制内容（Blob + anchor），适用于 PDF / 图片等 */
export function downloadBytes(bytes: Uint8Array, filename: string, mime = "application/octet-stream"): void {
  // 归一化为 ArrayBuffer 背书的 Uint8Array，兼容 TS 5.7 的泛型 TypedArray
  const normalized = new Uint8Array(bytes.length);
  normalized.set(bytes);
  const blob = new Blob([normalized], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/** 下载文本内容 */
export function downloadText(text: string, filename: string, mime = "text/plain;charset=utf-8"): void {
  downloadBytes(new TextEncoder().encode(text), filename, mime);
}
