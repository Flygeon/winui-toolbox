<template>
  <div class="tb-section exif-tool">
    <div class="tb-card">
      <div class="tb-row">
        <label class="tb-btn ex-choose" for="ex-input">选择图片…</label>
        <input id="ex-input" type="file" accept="image/*" class="ex-file-input" @change="onFile" />
        <span v-if="fileName" class="tb-hint">{{ fileName }}</span>
        <button v-if="hasExif" type="button" class="tb-btn tb-btn-primary" @click="stripAndDownload">剥离 EXIF 并下载</button>
      </div>
      <div v-if="loading" class="tb-hint">正在读取 EXIF…</div>
      <div v-else-if="error" class="tb-error">{{ error }}</div>
      <div v-else-if="!hasExif && fileName" class="tb-hint">该图片未包含 EXIF 信息。</div>
    </div>

    <div v-if="fields.length" class="tb-card">
      <p class="tb-title">EXIF 字段（{{ fields.length }} 项）</p>
      <table class="ex-table">
        <thead>
          <tr><th>字段</th><th>值</th></tr>
        </thead>
        <tbody>
          <tr v-for="f in fields" :key="f.tag">
            <td class="ex-tag">{{ f.tag }}</td>
            <td class="ex-val">{{ f.value }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <DownloadedBar :path="savedPath" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { readFileBytes, type ExifField } from "@/utils/image";
import { saveFileBytes } from "@/utils/file-save";
import DownloadedBar from "@/components/DownloadedBar.vue";

const fileName = ref("");
const fields = ref<ExifField[]>([]);
const loading = ref(false);
const error = ref("");
const savedPath = ref<string | null>(null);

let sourceFile: Blob | null = null;

const hasExif = computed(() => fields.value.length > 0);

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  error.value = "";
  savedPath.value = null;
  fields.value = [];
  sourceFile = file;
  fileName.value = file.name;
  loading.value = true;
  try {
    const bytes = await readFileBytes(file);
    const result = await invoke<{ fields: ExifField[] }>("exif_read", { bytes });
    fields.value = result.fields;
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

async function stripAndDownload() {
  if (!sourceFile) return;
  error.value = "";
  try {
    const bytes = await readFileBytes(sourceFile);
    const result = await invoke<number[]>("exif_strip", { bytes });
    const out = new Uint8Array(result);
    const base = fileName.value.split(".").slice(0, -1).join(".") || "image";
    savedPath.value = await saveFileBytes(out, `${base}_no_exif.png`, "image/png");
  } catch (err) {
    error.value = (err as Error).message;
  }
}
</script>

<style scoped>
.ex-choose {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}
.ex-file-input {
  display: none;
}
.ex-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.ex-table th {
  text-align: left;
  padding: 6px 10px;
  border-bottom: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
  font-weight: 600;
}
.ex-table td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.04));
  vertical-align: top;
}
.ex-tag {
  white-space: nowrap;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
  font-family: monospace;
}
.ex-val {
  word-break: break-all;
}
</style>
