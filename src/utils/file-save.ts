import { writeFile } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";
import { join } from "@tauri-apps/api/path";
import { useSettingsStore } from "@/stores/settings";

/**
 * 保存文件并返回实际保存路径：
 * - 若在设置中指定了「文件保存目录」，直接写入该目录（无对话框）；
 * - 否则弹出系统保存对话框由用户选择位置。
 * 返回 null 表示用户取消。
 */
export async function saveFileBytes(bytes: Uint8Array, filename: string, mime?: string): Promise<string | null> {
  void mime; // 写入磁盘无需 mime
  const settings = useSettingsStore();
  if (settings.downloadDir) {
    const path = await join(settings.downloadDir, filename);
    await writeFile(path, bytes);
    return path;
  }
  const path = await save({ defaultPath: filename });
  if (!path) return null;
  await writeFile(path, bytes);
  return path;
}

/** 返回文件所在目录（供「打开下载目录」用） */
export function dirOf(path: string): string {
  const idx = Math.max(path.lastIndexOf("\\"), path.lastIndexOf("/"));
  if (idx <= 0) return path;
  return path.slice(0, idx);
}
