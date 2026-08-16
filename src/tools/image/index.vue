<template>
  <div class="tb-section image-tool">
    <div class="tb-two-col">
      <div class="tb-card">
        <p class="tb-title">源图片</p>
        <div class="tb-row">
          <label class="tb-btn image-choose" for="image-input">选择图片…</label>
          <input id="image-input" type="file" accept="image/*" class="image-file-input" @change="onFile" />
          <span v-if="fileName" class="tb-hint">{{ fileName }}（{{ (sourceSize / 1024).toFixed(1) }} KB）</span>
        </div>
        <div class="image-preview">
          <img v-if="sourceUrl" :src="sourceUrl" alt="源图片" class="image-preview-img" />
          <p v-else class="tb-hint">选择图片后将在此预览…</p>
        </div>
      </div>

      <div class="tb-card">
        <p class="tb-title">转换设置</p>
        <div class="tb-row">
          <span class="tb-row-label">格式</span>
          <select v-model="format" class="nb-select">
            <option value="png">PNG（无损）</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
            <option value="bmp">BMP</option>
            <option value="tiff">TIFF</option>
            <option value="gif">GIF</option>
            <option value="ico">ICO</option>
            <option value="qoi">QOI</option>
          </select>
        </div>
        <div v-if="format !== 'png' && format !== 'bmp' && format !== 'tiff' && format !== 'gif' && format !== 'ico' && format !== 'qoi'" class="tb-row">
          <span class="tb-row-label">质量</span>
          <input v-model.number="quality" type="range" min="10" max="100" class="nb-range" />
          <span class="tb-hint">{{ quality }}%</span>
        </div>
        <div class="tb-row">
          <span class="tb-row-label">最大宽度</span>
          <input v-model.number="maxWidth" type="number" min="0" class="nb-input nb-input-num" />
          <span class="tb-hint">0 = 原尺寸，等比缩放</span>
        </div>
        <p v-if="error" class="tb-error">{{ error }}</p>
      </div>
    </div>

    <div class="tb-card">
      <div class="tb-row">
        <p class="tb-title tb-grow">转换结果</p>
        <span v-if="resultSize" class="tb-hint">{{ (resultSize / 1024).toFixed(1) }} KB</span>
        <button type="button" class="tb-btn tb-btn-primary" :disabled="!resultUrl" @click="download">下载</button>
      </div>
      <div class="image-preview">
        <img v-if="resultUrl" :src="resultUrl" alt="转换结果" class="image-preview-img" />
        <p v-else class="tb-hint">转换结果将在此预览…</p>
      </div>
      <DownloadedBar :path="savedPath" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { convertImageAuto, formatToMime, formatToExt, type ConvertFormat } from "@/utils/image";
import { saveFileBytes } from "@/utils/file-save";
import DownloadedBar from "@/components/DownloadedBar.vue";

const sourceUrl = ref("");
const resultUrl = ref("");
const fileName = ref("");
const sourceSize = ref(0);
const resultSize = ref(0);
const savedPath = ref<string | null>(null);
const format = ref<ConvertFormat>("png");
const quality = ref(90);
const maxWidth = ref(0);
const error = ref("");

let sourceFile: Blob | null = null;
let resultBlob: Blob | null = null;

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  error.value = "";
  savedPath.value = null;
  try {
    sourceFile = file;
    if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value);
    sourceUrl.value = URL.createObjectURL(file);
    fileName.value = file.name;
    sourceSize.value = file.size;
    await regenerate();
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function regenerate() {
  if (!sourceFile) return;
  try {
    const { blob } = await convertImageAuto(sourceFile, format.value, quality.value, maxWidth.value);
    resultBlob = blob;
    if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
    resultUrl.value = URL.createObjectURL(blob);
    resultSize.value = blob.size;
  } catch (err) {
    error.value = (err as Error).message;
  }
}

watch([format, quality, maxWidth], () => {
  void regenerate();
});

async function download() {
  if (!resultBlob) return;
  const base = fileName.value.split(".").slice(0, -1).join(".") || "image";
  const ext = formatToExt(format.value);
  const mime = formatToMime(format.value);
  const bytes = new Uint8Array(await resultBlob.arrayBuffer());
  savedPath.value = await saveFileBytes(bytes, `${base}.${ext}`, mime);
}
</script>

<style scoped>
.image-choose {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.image-file-input {
  display: none;
}

.nb-input-num {
  width: 90px;
}

.nb-range {
  width: 160px;
  accent-color: var(--accent-base, #0067c0);
}

.image-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  background: var(--card-bg-secondary, rgba(246, 246, 246, 0.5));
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  border-radius: 8px;
  padding: 14px;
}

.image-preview-img {
  max-width: 100%;
  max-height: 260px;
  border-radius: 4px;
}
</style>
