<template>
  <div class="tb-section transform-tool">
    <div class="tb-two-col">
      <div class="tb-card">
        <p class="tb-title">源图片</p>
        <div class="tb-row">
          <label class="tb-btn tf-choose" for="tf-input">选择图片…</label>
          <input id="tf-input" type="file" accept="image/*" class="tf-file-input" @change="onFile" />
          <span v-if="fileName" class="tb-hint">{{ fileName }}</span>
        </div>
        <div class="tf-preview">
          <img v-if="sourceUrl" :src="sourceUrl" alt="源图片" class="tf-preview-img" />
          <p v-else class="tb-hint">选择图片后将在此预览…</p>
        </div>
      </div>

      <div class="tb-card">
        <p class="tb-title">变换设置</p>
        <div class="tb-row">
          <span class="tb-row-label">旋转</span>
          <select v-model.number="rotate" class="nb-select">
            <option :value="0">不旋转</option>
            <option :value="90">90°</option>
            <option :value="180">180°</option>
            <option :value="270">270°</option>
          </select>
        </div>
        <div class="tb-row">
          <label class="tf-check"><input v-model="flipH" type="checkbox" /> 水平翻转</label>
          <label class="tf-check"><input v-model="flipV" type="checkbox" /> 垂直翻转</label>
        </div>
        <div class="tb-row">
          <span class="tb-row-label">裁剪 X</span>
          <input v-model.number="cropX" type="number" min="0" class="nb-input nb-input-sm" />
          <span class="tb-row-label">Y</span>
          <input v-model.number="cropY" type="number" min="0" class="nb-input nb-input-sm" />
        </div>
        <div class="tb-row">
          <span class="tb-row-label">裁剪宽</span>
          <input v-model.number="cropW" type="number" min="0" class="nb-input nb-input-sm" />
          <span class="tb-row-label">高</span>
          <input v-model.number="cropH" type="number" min="0" class="nb-input nb-input-sm" />
        </div>
        <div class="tb-row">
          <span class="tb-row-label">缩放宽</span>
          <input v-model.number="resizeW" type="number" min="0" class="nb-input nb-input-sm" />
          <span class="tb-row-label">高</span>
          <input v-model.number="resizeH" type="number" min="0" class="nb-input nb-input-sm" />
          <span class="tb-hint">0 = 不缩放</span>
        </div>
        <p v-if="error" class="tb-error">{{ error }}</p>
      </div>
    </div>

    <div class="tb-card">
      <div class="tb-row">
        <p class="tb-title tb-grow">变换结果</p>
        <span v-if="resultSize" class="tb-hint">{{ (resultSize / 1024).toFixed(1) }} KB</span>
        <button type="button" class="tb-btn tb-btn-primary" :disabled="!resultUrl" @click="download">下载</button>
      </div>
      <div class="tf-preview">
        <img v-if="resultUrl" :src="resultUrl" alt="变换结果" class="tf-preview-img" />
        <p v-else class="tb-hint">变换结果将在此预览…</p>
      </div>
      <DownloadedBar :path="savedPath" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { readFileBytes, formatToMime } from "@/utils/image";
import { saveFileBytes } from "@/utils/file-save";
import DownloadedBar from "@/components/DownloadedBar.vue";

const sourceUrl = ref("");
const resultUrl = ref("");
const fileName = ref("");
const resultSize = ref(0);
const savedPath = ref<string | null>(null);
const rotate = ref(0);
const flipH = ref(false);
const flipV = ref(false);
const cropX = ref(0);
const cropY = ref(0);
const cropW = ref(0);
const cropH = ref(0);
const resizeW = ref(0);
const resizeH = ref(0);
const error = ref("");

let sourceFile: Blob | null = null;
let resultBlob: Blob | null = null;

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
    const crop = cropW.value > 0 && cropH.value > 0 ? [cropX.value, cropY.value, cropW.value, cropH.value] : null;
    const result = await invoke<{ bytes: number[]; width: number; height: number }>("image_transform", {
      args: {
        bytes,
        rotate: rotate.value,
        flipH: flipH.value,
        flipV: flipV.value,
        crop,
        resizeW: resizeW.value,
        resizeH: resizeH.value,
      },
    });
    const out = new Uint8Array(result.bytes);
    resultBlob = new Blob([out], { type: "image/png" });
    if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
    resultUrl.value = URL.createObjectURL(resultBlob);
    resultSize.value = resultBlob.size;
  } catch (err) {
    error.value = (err as Error).message;
  }
}

watch([rotate, flipH, flipV, cropX, cropY, cropW, cropH, resizeW, resizeH], () => void regenerate());

async function download() {
  if (!resultBlob) return;
  const base = fileName.value.split(".").slice(0, -1).join(".") || "image";
  const bytes = new Uint8Array(await resultBlob.arrayBuffer());
  savedPath.value = await saveFileBytes(bytes, `${base}_transform.png`, formatToMime("png"));
}
</script>

<style scoped>
.tf-choose {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
.tf-file-input {
  display: none;
}
.nb-input-sm {
  width: 70px;
}
.tf-check {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
  cursor: pointer;
}
.tf-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  background: var(--card-bg-secondary, rgba(246, 246, 246, 0.5));
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  border-radius: 8px;
  padding: 14px;
}
.tf-preview-img {
  max-width: 100%;
  max-height: 260px;
  border-radius: 4px;
}
</style>
