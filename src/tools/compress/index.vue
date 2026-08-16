<template>
  <div class="tb-section compress-tool">
    <div class="tb-two-col">
      <div class="tb-card">
        <p class="tb-title">源图片</p>
        <div class="tb-row">
          <label class="tb-btn image-choose" for="compress-input">选择图片…</label>
          <input id="compress-input" type="file" accept="image/*" class="image-file-input" @change="onFile" />
          <span v-if="fileName" class="tb-hint">{{ fileName }}（{{ (sourceSize / 1024).toFixed(1) }} KB）</span>
        </div>
        <div class="image-preview">
          <img v-if="sourceUrl" :src="sourceUrl" alt="源图片" class="image-preview-img" />
          <p v-else class="tb-hint">选择图片后在此预览…</p>
        </div>
      </div>

      <div class="tb-card">
        <p class="tb-title">压缩设置</p>
        <div class="tb-row">
          <span class="tb-row-label">格式</span>
          <select v-model="format" class="nb-select">
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
            <option value="png">PNG（无损优化）</option>
          </select>
        </div>
        <div v-if="format !== 'png'" class="tb-row">
          <span class="tb-row-label">质量</span>
          <input v-model.number="quality" type="range" min="5" max="95" class="nb-range" />
          <span class="tb-hint">{{ quality }}%</span>
        </div>
        <div v-if="format === 'png'" class="tb-row">
          <span class="tb-row-label">优化级别</span>
          <input v-model.number="oxipngLevel" type="range" min="0" max="6" class="nb-range" />
          <span class="tb-hint">{{ oxipngLevel }}（0=关闭 OxiPNG）</span>
        </div>
        <p v-if="error" class="tb-error">{{ error }}</p>
      </div>
    </div>

    <div class="tb-card">
      <div class="tb-row">
        <p class="tb-title tb-grow">压缩结果</p>
        <div v-if="sourceSize && resultSize" class="compress-stats">
          <span class="compress-stat">{{ (sourceSize / 1024).toFixed(1) }} KB → {{ (resultSize / 1024).toFixed(1) }} KB</span>
          <span class="compress-saving" :class="{ 'is-worse': savingPct <= 0 }">
            {{ savingPct >= 0 ? `节省 ${savingPct}%` : `增大 ${-savingPct}%` }}
          </span>
        </div>
        <button type="button" class="tb-btn tb-btn-primary" :disabled="!resultUrl" @click="download">下载</button>
      </div>
      <div class="image-preview">
        <img v-if="resultUrl" :src="resultUrl" alt="压缩结果" class="image-preview-img" />
        <p v-else class="tb-hint">压缩结果将在此预览…</p>
      </div>
      <DownloadedBar :path="savedPath" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { loadImageFromFile, drawScaled, canvasToBlob, formatToMime, formatToExt, readFileBytes, type ConvertFormat } from "@/utils/image";
import { saveFileBytes } from "@/utils/file-save";
import DownloadedBar from "@/components/DownloadedBar.vue";

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

const sourceUrl = ref("");
const resultUrl = ref("");
const fileName = ref("");
const sourceSize = ref(0);
const resultSize = ref(0);
const savedPath = ref<string | null>(null);
const format = ref<ConvertFormat>("jpeg");
const quality = ref(60);
const oxipngLevel = ref(3);
const error = ref("");

let sourceFile: Blob | null = null;
let resultBlob: Blob | null = null;

const savingPct = computed(() =>
  sourceSize.value && resultSize.value ? Math.round((1 - resultSize.value / sourceSize.value) * 100) : 0
);

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
    if (isTauri()) {
      const bytes = await readFileBytes(sourceFile);
      const result = await invoke<{ bytes: number[]; width: number; height: number }>("image_compress", {
        args: {
          bytes,
          format: format.value,
          quality: quality.value,
          oxipngLevel: oxipngLevel.value,
          pngColors: 0,
        },
      });
      const out = new Uint8Array(result.bytes);
      resultBlob = new Blob([out], { type: formatToMime(format.value) });
    } else {
      // Canvas 降级（仅 jpeg/webp）
      const img = await loadImageFromFile(sourceFile);
      const canvas = drawScaled(img, img.naturalWidth, img.naturalHeight);
      const mime = format.value === "png" ? "image/png" : formatToMime(format.value);
      resultBlob = await canvasToBlob(canvas, mime, quality.value / 100);
    }
    if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
    resultUrl.value = URL.createObjectURL(resultBlob);
    resultSize.value = resultBlob.size;
  } catch (err) {
    error.value = (err as Error).message;
  }
}

watch([format, quality, oxipngLevel], () => void regenerate());

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

.nb-range {
  width: 180px;
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

.compress-stats {
  display: flex;
  align-items: center;
  gap: 10px;
}

.compress-stat {
  font-size: 13px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}

.compress-saving {
  font-size: 13px;
  font-weight: 600;
  color: #0f7b0f;
}

.compress-saving.is-worse {
  color: #c42b1c;
}
</style>
