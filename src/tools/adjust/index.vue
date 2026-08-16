<template>
  <div class="tb-section adjust-tool">
    <div class="tb-two-col">
      <div class="tb-card">
        <p class="tb-title">源图片</p>
        <div class="tb-row">
          <label class="tb-btn aj-choose" for="aj-input">选择图片…</label>
          <input id="aj-input" type="file" accept="image/*" class="aj-file-input" @change="onFile" />
          <span v-if="fileName" class="tb-hint">{{ fileName }}</span>
        </div>
        <div class="aj-preview">
          <img v-if="sourceUrl" :src="sourceUrl" alt="源图片" class="aj-preview-img" />
          <p v-else class="tb-hint">选择图片后将在此预览…</p>
        </div>
      </div>

      <div class="tb-card">
        <p class="tb-title">调整参数</p>
        <div class="aj-slider">
          <span class="tb-row-label">亮度</span>
          <input v-model.number="brightness" type="range" min="-100" max="100" class="nb-range" />
          <span class="tb-hint">{{ brightness }}</span>
        </div>
        <div class="aj-slider">
          <span class="tb-row-label">对比度</span>
          <input v-model.number="contrast" type="range" min="-100" max="100" class="nb-range" />
          <span class="tb-hint">{{ contrast }}</span>
        </div>
        <div class="aj-slider">
          <span class="tb-row-label">饱和度</span>
          <input v-model.number="saturation" type="range" min="-100" max="100" class="nb-range" />
          <span class="tb-hint">{{ saturation }}</span>
        </div>
        <div class="aj-slider">
          <span class="tb-row-label">色相</span>
          <input v-model.number="hue" type="range" min="-180" max="180" class="nb-range" />
          <span class="tb-hint">{{ hue }}°</span>
        </div>
        <div class="aj-slider">
          <span class="tb-row-label">伽马</span>
          <input v-model.number="gamma" step="0.1" type="range" min="0.1" max="10" class="nb-range" />
          <span class="tb-hint">{{ gamma.toFixed(1) }}</span>
        </div>
        <div class="aj-slider">
          <span class="tb-row-label">色温</span>
          <input v-model.number="temperature" type="range" min="-100" max="100" class="nb-range" />
          <span class="tb-hint">{{ temperature }}</span>
        </div>
        <div class="tb-row">
          <span class="tb-row-label">输出</span>
          <select v-model="format" class="nb-select">
            <option value="jpeg">JPEG</option>
            <option value="png">PNG</option>
            <option value="webp">WebP</option>
          </select>
        </div>
        <div class="tb-row">
          <button type="button" class="tb-btn" @click="resetParams">重置参数</button>
        </div>
        <p v-if="error" class="tb-error">{{ error }}</p>
      </div>
    </div>

    <div class="tb-card">
      <div class="tb-row">
        <p class="tb-title tb-grow">调整结果</p>
        <span v-if="resultSize" class="tb-hint">{{ (resultSize / 1024).toFixed(1) }} KB</span>
        <button type="button" class="tb-btn tb-btn-primary" :disabled="!resultUrl" @click="download">下载</button>
      </div>
      <div class="aj-preview">
        <img v-if="resultUrl" :src="resultUrl" alt="调整结果" class="aj-preview-img" />
        <p v-else class="tb-hint">调整结果将在此预览…</p>
      </div>
      <DownloadedBar :path="savedPath" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { readFileBytes, formatToMime, formatToExt, type ConvertFormat } from "@/utils/image";
import { saveFileBytes } from "@/utils/file-save";
import DownloadedBar from "@/components/DownloadedBar.vue";

const sourceUrl = ref("");
const resultUrl = ref("");
const fileName = ref("");
const resultSize = ref(0);
const savedPath = ref<string | null>(null);
const brightness = ref(0);
const contrast = ref(0);
const saturation = ref(0);
const hue = ref(0);
const gamma = ref(1.0);
const temperature = ref(0);
const format = ref<ConvertFormat>("jpeg");
const quality = ref(90);
const error = ref("");

let sourceFile: Blob | null = null;
let resultBlob: Blob | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  error.value = "";
  savedPath.value = null;
  sourceFile = file;
  if (sourceUrl.value) URL.revokeObjectURL(sourceUrl.value);
  sourceUrl.value = URL.createObjectURL(file);
  fileName.value = file.name;
  await regenerate();
}

async function regenerate() {
  if (!sourceFile) return;
  try {
    const bytes = await readFileBytes(sourceFile);
    const result = await invoke<{ bytes: number[]; width: number; height: number }>("image_adjust", {
      args: {
        bytes,
        brightness: brightness.value,
        contrast: contrast.value,
        saturation: saturation.value,
        hue: hue.value,
        gamma: gamma.value,
        temperature: temperature.value,
        format: format.value,
        quality: quality.value,
      },
    });
    const out = new Uint8Array(result.bytes);
    resultBlob = new Blob([out], { type: formatToMime(format.value) });
    if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
    resultUrl.value = URL.createObjectURL(resultBlob);
    resultSize.value = resultBlob.size;
  } catch (err) {
    error.value = (err as Error).message;
  }
}

watch([brightness, contrast, saturation, hue, gamma, temperature, format], () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => void regenerate(), 200);
});

function resetParams() {
  brightness.value = 0;
  contrast.value = 0;
  saturation.value = 0;
  hue.value = 0;
  gamma.value = 1.0;
  temperature.value = 0;
}

async function download() {
  if (!resultBlob) return;
  const base = fileName.value.split(".").slice(0, -1).join(".") || "image";
  const ext = formatToExt(format.value);
  const mime = formatToMime(format.value);
  const bytes = new Uint8Array(await resultBlob.arrayBuffer());
  savedPath.value = await saveFileBytes(bytes, `${base}_adjusted.${ext}`, mime);
}
</script>

<style scoped>
.aj-choose {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
.aj-file-input {
  display: none;
}
.nb-range {
  width: 160px;
  accent-color: var(--accent-base, #0067c0);
}
.aj-slider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.aj-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  background: var(--card-bg-secondary, rgba(246, 246, 246, 0.5));
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  border-radius: 8px;
  padding: 14px;
}
.aj-preview-img {
  max-width: 100%;
  max-height: 260px;
  border-radius: 4px;
}
</style>
