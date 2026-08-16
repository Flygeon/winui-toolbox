/**
 * 图像处理工具封装（Rust 后端优先，Canvas 降级）。
 *
 * Tauri 环境下调用 Rust 命令（image_ops.rs）；
 * 纯浏览器环境（开发预览）降级为 Canvas 方案。
 */

import { invoke } from "@tauri-apps/api/core";

/** 是否在 Tauri 环境（有 invoke 通道） */
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

// ---------- Canvas 降级实现（保留原 utils/image.ts 的能力） ----------

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

// ---------- Rust 后端类型定义 ----------

export type ConvertFormat = "png" | "jpeg" | "webp" | "bmp" | "tiff" | "gif" | "ico" | "qoi";

export interface ConvertArgs {
  bytes: number[];
  format: ConvertFormat;
  quality?: number;
  maxWidth?: number;
}

export interface ConvertResult {
  bytes: number[];
  width: number;
  height: number;
}

export interface CompressArgs {
  bytes: number[];
  format: ConvertFormat;
  quality?: number;
  oxipngLevel?: number;
  pngColors?: number;
}

export interface TransformArgs {
  bytes: number[];
  rotate?: number;
  flipH?: boolean;
  flipV?: boolean;
  crop?: [number, number, number, number] | null;
  resizeW?: number;
  resizeH?: number;
}

export interface AdjustArgs {
  bytes: number[];
  brightness?: number;
  contrast?: number;
  saturation?: number;
  hue?: number;
  gamma?: number;
  temperature?: number;
  format?: ConvertFormat;
  quality?: number;
}

export interface ExifField {
  tag: string;
  value: string;
}

export interface ExifReadResult {
  fields: ExifField[];
}

// ---------- Rust 后端封装 ----------

/** 读取文件为字节数组 */
export async function readFileBytes(file: Blob): Promise<number[]> {
  const buf = await file.arrayBuffer();
  return Array.from(new Uint8Array(buf));
}

/** 将 Rust 返回的字节数组转为 Uint8Array */
function toUint8(bytes: number[]): Uint8Array {
  return new Uint8Array(bytes);
}

/** 格式转码（Rust 后端） */
export async function convertImage(args: ConvertArgs): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const result = await invoke<ConvertResult>("image_convert", { args });
  return { bytes: toUint8(result.bytes), width: result.width, height: result.height };
}

/** 压缩图片（Rust 后端） */
export async function compressImage(args: CompressArgs): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const result = await invoke<ConvertResult>("image_compress", { args });
  return { bytes: toUint8(result.bytes), width: result.width, height: result.height };
}

/** 图像变换（Rust 后端） */
export async function transformImage(args: TransformArgs): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const result = await invoke<ConvertResult>("image_transform", { args });
  return { bytes: toUint8(result.bytes), width: result.width, height: result.height };
}

/** 图像调整（Rust 后端） */
export async function adjustImage(args: AdjustArgs): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  const result = await invoke<ConvertResult>("image_adjust", { args });
  return { bytes: toUint8(result.bytes), width: result.width, height: result.height };
}

/** 读取 EXIF（Rust 后端） */
export async function readExif(bytes: number[]): Promise<ExifReadResult> {
  return await invoke<ExifReadResult>("exif_read", { bytes });
}

/** 剥离 EXIF（Rust 后端） */
export async function stripExif(bytes: number[]): Promise<Uint8Array> {
  const result = await invoke<number[]>("exif_strip", { bytes });
  return toUint8(result);
}

/** 感知哈希（Rust 后端） */
export async function phash(bytes: number[]): Promise<string> {
  return await invoke<string>("image_phash", { bytes });
}

// ---------- 统一入口：Tauri 优先，Canvas 降级 ----------

/**
 * 格式转码统一入口。
 * Tauri 环境走 Rust；纯浏览器降级 Canvas（仅支持 png/jpeg/webp）。
 */
export async function convertImageAuto(
  file: Blob,
  format: ConvertFormat,
  quality = 90,
  maxWidth = 0
): Promise<{ blob: Blob; width: number; height: number }> {
  if (isTauri()) {
    const bytes = await readFileBytes(file);
    const { bytes: out, width, height } = await convertImage({ bytes, format, quality, maxWidth });
    const mime = formatToMime(format);
    return { blob: new Blob([out], { type: mime }), width, height };
  }
  // Canvas 降级
  const img = await loadImageFromFile(file);
  const canvas = drawScaled(img, maxWidth > 0 ? maxWidth : img.naturalWidth, maxWidth > 0 ? maxWidth * 10 : img.naturalHeight);
  const mime = formatToMime(format);
  if (format !== "png" && format !== "jpeg" && format !== "webp") {
    throw new Error(`浏览器环境不支持 ${format} 格式，请在 Tauri 环境中使用。`);
  }
  const blob = await canvasToBlob(canvas, mime, quality / 100);
  return { blob, width: canvas.width, height: canvas.height };
}

/** 格式转 MIME */
export function formatToMime(format: ConvertFormat): string {
  switch (format) {
    case "png": return "image/png";
    case "jpeg": return "image/jpeg";
    case "webp": return "image/webp";
    case "bmp": return "image/bmp";
    case "tiff": return "image/tiff";
    case "gif": return "image/gif";
    case "ico": return "image/x-icon";
    case "qoi": return "image/x-qoi";
  }
}

/** 格式转文件扩展名 */
export function formatToExt(format: ConvertFormat): string {
  switch (format) {
    case "jpeg": return "jpg";
    default: return format;
  }
}
