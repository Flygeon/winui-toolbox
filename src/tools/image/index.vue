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
          </select>
        </div>
        <div v-if="format !== 'png'" class="tb-row">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { loadImageFromFile, drawScaled, canvasToBlob } from "@/utils/image";
import { downloadBytes } from "@/utils/download";

const sourceUrl = ref("");
const resultUrl = ref("");
const fileName = ref("");
const sourceSize = ref(0);
const resultSize = ref(0);
const format = ref<"png" | "jpeg" | "webp">("png");
const quality = ref(90);
const maxWidth = ref(0);
const error = ref("");

let sourceImage: HTMLImageElement | null = null;
let resultBlob: Blob | null = null;

const mimeOf = computed(() => (format.value === "png" ? "image/png" : format.value === "jpeg" ? "image/jpeg" : "image/webp"));

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  error.value = "";
  try {
    sourceImage = await loadImageFromFile(file);
    sourceUrl.value = URL.createObjectURL(file);
    fileName.value = file.name;
    sourceSize.value = file.size;
    await regenerate();
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function regenerate() {
  if (!sourceImage) return;
  const maxW = maxWidth.value > 0 ? maxWidth.value : sourceImage.naturalWidth;
  const canvas = drawScaled(sourceImage, maxW, maxW * 10);
  resultBlob = await canvasToBlob(canvas, mimeOf.value, quality.value / 100);
  if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
  resultUrl.value = URL.createObjectURL(resultBlob);
  resultSize.value = resultBlob.size;
}

watch([format, quality, maxWidth], () => {
  void regenerate();
});

function download() {
  if (!resultBlob) return;
  const base = fileName.value.split(".").slice(0, -1).join(".") || "image";
  void resultBlob.arrayBuffer().then((buf) => {
    downloadBytes(new Uint8Array(buf), `${base}.${format.value}`, mimeOf.value);
  });
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
