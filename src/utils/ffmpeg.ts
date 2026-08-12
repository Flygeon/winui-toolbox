import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "@/stores/settings";

/** FFmpeg 官方推荐下载页（gyan.dev：Windows 全功能构建） */
export const FFMPEG_DOWNLOAD_URL = "https://www.gyan.dev/ffmpeg/builds/";
/** ffmpeg 未找到时 runFfmpeg 抛出的错误信息 */
export const FFMPEG_MISSING = "未找到 FFmpeg，请到「设置 → FFmpeg」配置本地 ffmpeg。";

export interface RunResult {
  code: number;
  stderr: string;
}

/**
 * 解析可用的 ffmpeg：优先用户选定路径（并校验），否则扫描 PATH。
 * 找到后写入设置，返回路径；找不到返回 null。
 */
export async function resolveFfmpeg(): Promise<string | null> {
  const settings = useSettingsStore();
  if (settings.ffmpegPath) {
    try {
      const version = await invoke<string>("get_ffmpeg_version", { path: settings.ffmpegPath });
      await settings.setFfmpegVersion(version);
      return settings.ffmpegPath;
    } catch {
      await settings.clearFfmpeg();
    }
  }
  const found = await invoke<string | null>("find_ffmpeg_in_path");
  if (found) {
    let version = "";
    try {
      version = await invoke<string>("get_ffmpeg_version", { path: found });
    } catch {
      /* 版本读取失败不影响使用 */
    }
    await settings.setFfmpeg(found, version);
    return found;
  }
  return null;
}

/** 运行 ffmpeg（自动解析路径），返回退出码与 stderr；未找到 ffmpeg 时抛 FFMPEG_MISSING */
export async function runFfmpeg(args: string[]): Promise<RunResult> {
  const path = await resolveFfmpeg();
  if (!path) throw new Error(FFMPEG_MISSING);
  return await invoke<RunResult>("ffmpeg_run", { ffmpegPath: path, args });
}
