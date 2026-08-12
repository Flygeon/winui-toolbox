/** Canvas 图片处理工具（纯前端，用于格式转换 / 压缩 / 图标生成） */

export function loadImageFromFile(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片加载失败，请确认文件为有效的图片格式。"));
    };
    img.src = url;
  });
}

/** 等比缩放到最大宽高内，返回 canvas */
export function drawScaled(img: HTMLImageElement, maxW: number, maxH: number): HTMLCanvasElement {
  const scale = Math.min(1, maxW / (img.naturalWidth || 1), maxH / (img.naturalHeight || 1));
  const w = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
  const h = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

/** 精确绘制到指定尺寸（图标生成用，必要时拉伸） */
export function drawExact(img: HTMLImageElement, size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, size, size);
  }
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("导出失败，请重试。"))),
      type,
      quality
    );
  });
}
