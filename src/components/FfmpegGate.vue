<template>
  <div class="ffmpeg-gate">
    <span class="ffmpeg-gate-icon" aria-hidden="true">&#xE768;</span>
    <h3 class="ffmpeg-gate-title">未找到 FFmpeg</h3>
    <p class="ffmpeg-gate-desc">
      本功能需要本地 FFmpeg。工具箱不会内置 FFmpeg，请到「设置 → FFmpeg」扫描 PATH 或手动选择，
      或按提示下载后重新尝试。
    </p>
    <div class="ffmpeg-gate-actions">
      <button type="button" class="tb-btn tb-btn-primary" @click="goSettings">前往设置配置</button>
      <button type="button" class="tb-btn" @click="copyUrl">复制下载链接</button>
    </div>
    <p class="ffmpeg-gate-hint">官方推荐下载：{{ FFMPEG_DOWNLOAD_URL }}</p>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { FFMPEG_DOWNLOAD_URL } from "@/utils/ffmpeg";
import { writeClipboard } from "@/utils/clipboard";

const router = useRouter();

function goSettings() {
  void router.push("/settings");
}

async function copyUrl() {
  await writeClipboard(FFMPEG_DOWNLOAD_URL);
}
</script>

<style scoped>
.ffmpeg-gate {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 24px;
  gap: 8px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}

.ffmpeg-gate-icon {
  font-family: "WinUIOnWebIcons", "Segoe Fluent Icons", "Segoe MDL2 Assets", sans-serif;
  font-size: 40px;
  color: var(--accent-base, #0067c0);
}

.ffmpeg-gate-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
}

.ffmpeg-gate-desc {
  max-width: 420px;
  font-size: 13px;
  line-height: 1.6;
}

.ffmpeg-gate-actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.ffmpeg-gate-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-tertiary, rgba(0, 0, 0, 0.4458));
  word-break: break-all;
}
</style>
