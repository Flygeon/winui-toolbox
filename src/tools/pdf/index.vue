<template>
  <div class="tb-section pdf-tool">
    <div class="tb-card">
      <div class="tb-row">
        <div class="nb-segmented" role="tablist" aria-label="PDF 操作">
          <button
            v-for="op in ops"
            :key="op.value"
            type="button"
            class="nb-segmented-item"
            :class="{ 'is-active': op.value === currentOp }"
            @click="currentOp = op.value">
            {{ op.label }}
          </button>
        </div>
      </div>
      <p class="tb-hint">所有操作均在本地完成，文件不会上传。PDF 处理基于 pdf-lib（纯前端）。</p>
    </div>

    <div class="tb-card">
      <!-- 合并 -->
      <template v-if="currentOp === 'merge'">
        <div class="tb-row">
          <p class="tb-title tb-grow">选择多个 PDF（按顺序合并）</p>
          <button type="button" class="tb-btn tb-btn-primary" @click="pickMerge">选择文件…</button>
        </div>
        <div v-if="mergeFiles.length" class="file-list">
          <div v-for="(f, i) in mergeFiles" :key="i" class="file-item">
            <span class="file-order">{{ i + 1 }}</span>
            <span class="file-name">{{ f.name }}</span>
          </div>
        </div>
      </template>

      <!-- 拆分 -->
      <template v-else-if="currentOp === 'split'">
        <div class="tb-row">
          <p class="tb-title tb-grow">选择 PDF</p>
          <button type="button" class="tb-btn tb-btn-primary" @click="pickSplit">选择文件…</button>
        </div>
        <p v-if="splitFile" class="tb-hint">{{ splitFile.name }} · 共 {{ splitPageCount }} 页</p>
        <div v-if="splitFile" class="tb-row">
          <span class="tb-row-label">页码</span>
          <WinTextBox v-model:Text="splitRange" PlaceholderText="例如 1-3,5,8-10" class="tb-grow" Height="38" />
        </div>
      </template>

      <!-- 旋转 -->
      <template v-else-if="currentOp === 'rotate'">
        <div class="tb-row">
          <p class="tb-title tb-grow">选择 PDF（整份旋转）</p>
          <button type="button" class="tb-btn tb-btn-primary" @click="pickRotate">选择文件…</button>
        </div>
        <p v-if="rotateFile" class="tb-hint">{{ rotateFile.name }}</p>
        <div v-if="rotateFile" class="tb-row">
          <span class="tb-row-label">角度</span>
          <select v-model="rotateDeg" class="nb-select">
            <option :value="90">顺时针 90°</option>
            <option :value="180">180°</option>
            <option :value="270">逆时针 90°（270°）</option>
          </select>
        </div>
      </template>

      <!-- 加密 -->
      <template v-else-if="currentOp === 'encrypt'">
        <div class="tb-row">
          <p class="tb-title tb-grow">选择 PDF</p>
          <button type="button" class="tb-btn tb-btn-primary" @click="pickEncrypt">选择文件…</button>
        </div>
        <p v-if="encryptFile" class="tb-hint">{{ encryptFile.name }}</p>
        <div v-if="encryptFile" class="tb-row">
          <span class="tb-row-label">密码</span>
          <WinTextBox v-model:Text="encryptPassword" PlaceholderText="设置打开密码" class="tb-grow" Height="38" />
        </div>
      </template>

      <!-- 解密 -->
      <template v-else-if="currentOp === 'decrypt'">
        <div class="tb-row">
          <p class="tb-title tb-grow">选择 PDF（已加密）</p>
          <button type="button" class="tb-btn tb-btn-primary" @click="pickDecrypt">选择文件…</button>
        </div>
        <p v-if="decryptFile" class="tb-hint">{{ decryptFile.name }}</p>
        <div v-if="decryptFile" class="tb-row">
          <span class="tb-row-label">密码</span>
          <WinTextBox v-model:Text="decryptPassword" PlaceholderText="输入打开密码" class="tb-grow" Height="38" />
        </div>
      </template>

      <div class="tb-row">
        <button type="button" class="tb-btn tb-btn-primary" :disabled="busy || !canRun" @click="run">
          {{ busy ? "处理中…" : runLabel }}
        </button>
        <span v-if="busy" class="tb-hint">{{ status }}</span>
      </div>
      <p v-if="error" class="tb-error">{{ error }}</p>
      <p v-if="!hasTauri" class="tb-hint">文件选择仅 Tauri 应用内可用（浏览器预览不支持）。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { PDFDocument, degrees } from "pdf-lib";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import WinTextBox from "@/winui/components/WinTextBox.vue";
import { downloadBytes } from "@/utils/download";

const hasTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

type Op = "merge" | "split" | "rotate" | "encrypt" | "decrypt";

const ops: { value: Op; label: string }[] = [
  { value: "merge", label: "合并" },
  { value: "split", label: "拆分" },
  { value: "rotate", label: "旋转" },
  { value: "encrypt", label: "加密" },
  { value: "decrypt", label: "解密" },
];

const currentOp = ref<Op>("merge");
const busy = ref(false);
const status = ref("");
const error = ref("");

const mergeFiles = ref<{ name: string; path: string }[]>([]);
const splitFile = ref<{ name: string; path: string } | null>(null);
const splitPageCount = ref(0);
const splitRange = ref("");
const rotateFile = ref<{ name: string; path: string } | null>(null);
const rotateDeg = ref<90 | 180 | 270>(90);
const encryptFile = ref<{ name: string; path: string } | null>(null);
const encryptPassword = ref("");
const decryptFile = ref<{ name: string; path: string } | null>(null);
const decryptPassword = ref("");

const runLabel = computed(() => {
  const t: Record<Op, string> = { merge: "合并并下载", split: "拆分并下载", rotate: "旋转并下载", encrypt: "加密并下载", decrypt: "解密并下载" };
  return t[currentOp.value];
});

const canRun = computed(() => {
  switch (currentOp.value) {
    case "merge":
      return mergeFiles.value.length >= 2;
    case "split":
      return !!splitFile.value && !!splitRange.value.trim() && splitPageCount.value > 0;
    case "rotate":
      return !!rotateFile.value;
    case "encrypt":
      return !!encryptFile.value && !!encryptPassword.value;
    case "decrypt":
      return !!decryptFile.value && !!decryptPassword.value;
  }
});

async function pick(predicate: () => void) {
  error.value = "";
  try {
    predicate();
  } catch {
    /* dialog 取消 */
  }
}

async function pickMerge() {
  await pick(async () => {
    const sel = await open({ multiple: true, filters: [{ name: "PDF", extensions: ["pdf"] }] });
    if (!sel) return;
    const arr = Array.isArray(sel) ? sel : [sel];
    mergeFiles.value = arr.map((p) => ({ name: (p as string).split(/[\\/]/).pop() ?? "file.pdf", path: p as string }));
  });
}

async function pickSplit() {
  await pick(async () => {
    const sel = await open({ multiple: false, filters: [{ name: "PDF", extensions: ["pdf"] }] });
    if (!sel) return;
    const path = sel as string;
    splitFile.value = { name: path.split(/[\\/]/).pop() ?? "file.pdf", path };
    const bytes = await readFile(path);
    const doc = await PDFDocument.load(bytes);
    splitPageCount.value = doc.getPageCount();
  });
}

async function pickRotate() {
  await pick(async () => {
    const sel = await open({ multiple: false, filters: [{ name: "PDF", extensions: ["pdf"] }] });
    if (!sel) return;
    const path = sel as string;
    rotateFile.value = { name: path.split(/[\\/]/).pop() ?? "file.pdf", path };
  });
}

async function pickEncrypt() {
  await pick(async () => {
    const sel = await open({ multiple: false, filters: [{ name: "PDF", extensions: ["pdf"] }] });
    if (!sel) return;
    const path = sel as string;
    encryptFile.value = { name: path.split(/[\\/]/).pop() ?? "file.pdf", path };
  });
}

async function pickDecrypt() {
  await pick(async () => {
    const sel = await open({ multiple: false, filters: [{ name: "PDF", extensions: ["pdf"] }] });
    if (!sel) return;
    const path = sel as string;
    decryptFile.value = { name: path.split(/[\\/]/).pop() ?? "file.pdf", path };
  });
}

/** 解析 1-based 页范围：1-3,5,8-10 */
function parseRanges(text: string, max: number): number[] {
  const idx = new Set<number>();
  for (const part of text.split(",")) {
    const p = part.trim();
    if (!p) continue;
    const m = /^(\d+)\s*-\s*(\d+)$/.exec(p);
    if (m) {
      const a = Math.max(1, Math.min(Number(m[1]), max));
      const b = Math.max(1, Math.min(Number(m[2]), max));
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) idx.add(i - 1);
    } else if (/^\d+$/.test(p)) {
      idx.add(Math.min(Number(p), max) - 1);
    }
  }
  return [...idx].sort((a, b) => a - b);
}

async function run() {
  if (!hasTauri) {
    error.value = "文件操作仅 Tauri 应用内可用。";
    return;
  }
  error.value = "";
  busy.value = true;
  status.value = "读取文件…";
  try {
    switch (currentOp.value) {
      case "merge": {
        const out = await PDFDocument.create();
        for (const f of mergeFiles.value) {
          status.value = `合并 ${f.name}…`;
          const bytes = await readFile(f.path);
          const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
          const pages = await out.copyPages(src, src.getPageIndices());
          pages.forEach((p) => out.addPage(p));
        }
        downloadBytes(await out.save(), "merged.pdf", "application/pdf");
        status.value = "完成";
        break;
      }
      case "split": {
        const bytes = await readFile(splitFile.value!.path);
        const src = await PDFDocument.load(bytes);
        const indices = parseRanges(splitRange.value, splitPageCount.value);
        if (!indices.length) throw new Error("未解析到有效页码。");
        const out = await PDFDocument.create();
        const pages = await out.copyPages(src, indices);
        pages.forEach((p) => out.addPage(p));
        downloadBytes(await out.save(), "split.pdf", "application/pdf");
        status.value = "完成";
        break;
      }
      case "rotate": {
        const bytes = await readFile(rotateFile.value!.path);
        const src = await PDFDocument.load(bytes);
        src.getPages().forEach((p) => p.setRotation(degrees(rotateDeg.value)));
        downloadBytes(await src.save(), "rotated.pdf", "application/pdf");
        status.value = "完成";
        break;
      }
      case "encrypt": {
        const bytes = await readFile(encryptFile.value!.path);
        const src = await PDFDocument.load(bytes);
        // pdf-lib 1.17 的 .d.ts 未声明 encrypt 方法（运行时存在）
        const withEncrypt = src as unknown as {
          encrypt(opts: { userPassword: string; ownerPassword: string; permissions: Record<string, string | boolean> }): void;
        };
        withEncrypt.encrypt({
          userPassword: encryptPassword.value,
          ownerPassword: encryptPassword.value,
          permissions: { printing: "highResolution", modifying: true, copying: true, annotating: true, fillingForms: true, contentAccessibility: true, documentAssembly: true },
        });
        downloadBytes(await src.save(), "encrypted.pdf", "application/pdf");
        status.value = "完成";
        break;
      }
      case "decrypt": {
        const bytes = await readFile(decryptFile.value!.path);
        // LoadOptions 类型缺失 password 字段（运行时支持）
        const loadOptions = { password: decryptPassword.value } as unknown as Parameters<typeof PDFDocument.load>[1];
        const src = await PDFDocument.load(bytes, loadOptions);
        downloadBytes(await src.save(), "decrypted.pdf", "application/pdf");
        status.value = "完成";
        break;
      }
    }
  } catch (e) {
    error.value = `处理失败：${(e as Error).message}`;
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.file-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.file-order {
  flex: none;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--accent-aa-fill, #004e8c);
  color: var(--accent-aa-text, #ffffff);
  font-size: 12px;
}

.file-name {
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
  word-break: break-all;
}
</style>
