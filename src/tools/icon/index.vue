<template>
  <div class="tb-section icon-tool">
    <div class="tb-card">
      <div class="tb-row">
        <p class="tb-title tb-grow">从一张图片生成各平台图标尺寸</p>
        <label class="tb-btn tb-btn-primary image-choose" for="icon-input">选择源图…</label>
        <input id="icon-input" type="file" accept="image/*" class="image-file-input" @change="onFile" />
        <span v-if="fileName" class="tb-hint">{{ fileName }}（{{ sourceSize }}×{{ sourceSize }}）</span>
      </div>
      <p class="tb-hint">建议使用 1024×1024 的正方形源图；输出为 PNG，可直接用作桌面快捷方式 / 文件夹图标 / 软件图标。</p>
      <p v-if="error" class="tb-error">{{ error }}</p>
    </div>

    <div v-if="icons.length" class="tb-card">
      <p class="tb-title">生成的尺寸</p>
      <div class="icon-grid">
        <div v-for="ic in icons" :key="ic.size" class="icon-cell">
          <div class="icon-preview-wrap" :style="{ width: Math.min(ic.size, 96) + 'px', height: Math.min(ic.size, 96) + 'px' }">
            <img :src="ic.url" :width="Math.min(ic.size, 96)" :height="Math.min(ic.size, 96)" alt="图标" />
          </div>
          <span class="icon-size">{{ ic.size }}px</span>
          <button type="button" class="tb-btn tb-btn-mini" @click="downloadOne(ic)">下载</button>
        </div>
      </div>
      <div class="tb-row icon-actions">
        <button type="button" class="tb-btn tb-btn-primary" @click="downloadAll">逐个下载全部</button>
        <span class="tb-hint">如需 .ico 单文件图标，可用生成的 256px PNG 在设置中替换应用图标（npx tauri icon）。</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { loadImageFromFile, drawExact, canvasToBlob } from "@/utils/image";
import { downloadBytes } from "@/utils/download";

const SIZES = [16, 32, 48, 64, 128, 256, 512];

interface IconItem {
  size: number;
  url: string;
  blob: Blob;
}

const sourceUrl = ref("");
const fileName = ref("");
const sourceSize = ref(0);
const icons = ref<IconItem[]>([]);
const error = ref("");

let sourceImage: HTMLImageElement | null = null;

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  error.value = "";
  try {
    sourceImage = await loadImageFromFile(file);
    sourceUrl.value = URL.createObjectURL(file);
    fileName.value = file.name;
    sourceSize.value = sourceImage.naturalWidth;
    icons.value = [];
    for (const size of SIZES) {
      const canvas = drawExact(sourceImage, size);
      const blob = await canvasToBlob(canvas, "image/png");
      icons.value.push({ size, url: URL.createObjectURL(blob), blob });
    }
  } catch (err) {
    error.value = (err as Error).message;
  }
}

function downloadOne(ic: IconItem) {
  void ic.blob.arrayBuffer().then((buf) => {
    downloadBytes(new Uint8Array(buf), `icon-${ic.size}px.png`, "image/png");
  });
}

function downloadAll() {
  // 逐个下载（浏览器限制），间隔 300ms 避免被拦截
  icons.value.forEach((ic, i) => {
    setTimeout(() => downloadOne(ic), i * 300);
  });
}
</script>

<style scoped>
.image-choose {
  cursor: pointer;
}

.image-file-input {
  display: none;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 16px;
}

.icon-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.icon-preview-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-bg-secondary, rgba(246, 246, 246, 0.5));
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  border-radius: 8px;
  padding: 8px;
}

.icon-preview-wrap img {
  image-rendering: auto;
}

.icon-size {
  font-size: 12px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}

.tb-btn-mini {
  height: 26px;
  padding: 0 12px;
  font-size: 12px;
}

.icon-actions {
  margin-top: 6px;
  padding-top: 14px;
  border-top: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
}
</style>
