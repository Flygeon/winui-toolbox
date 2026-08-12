<template>
  <div class="tb-section hash-tool">
    <div class="tb-two-col">
      <div class="tb-card">
        <p class="tb-title">摘要（实时计算）</p>
        <WinTextBox
          v-model:Text="hashInput"
          PlaceholderText="输入文本，实时计算 MD5 / SHA 系列…"
          AcceptsReturn
          TextWrapping="Wrap"
          Height="140" />
        <div class="hash-rows">
          <div v-for="row in hashRows" :key="row.name" class="hash-row">
            <span class="hash-name">{{ row.name }}</span>
            <code class="hash-value">{{ row.value }}</code>
            <button type="button" class="tb-btn tb-btn-mini" title="复制" @click="copy(row.value)">复制</button>
          </div>
        </div>
      </div>

      <div class="tb-card">
        <p class="tb-title">对称加解密（口令模式）</p>
        <div class="tb-row">
          <span class="tb-row-label">算法</span>
          <select v-model="cipher" class="nb-select">
            <option value="AES">AES（推荐）</option>
            <option value="DES">DES</option>
          </select>
        </div>
        <WinTextBox
          v-model:Text="cipherKey"
          PlaceholderText="口令（Passphrase），越长越安全"
          Height="38" />
        <WinTextBox
          v-model:Text="cipherInput"
          PlaceholderText="加密：输入明文 / 解密：输入密文（Base64）"
          AcceptsReturn
          TextWrapping="Wrap"
          Height="140" />
        <div class="tb-row">
          <button type="button" class="tb-btn tb-btn-primary" @click="doEncrypt">加密</button>
          <button type="button" class="tb-btn" @click="doDecrypt">解密</button>
          <CopyButton :text="cipherOutput" />
        </div>
        <WinTextBox
          v-model:Text="cipherOutput"
          AcceptsReturn
          TextWrapping="Wrap"
          IsReadOnly
          Height="100"
          PlaceholderText="结果…" />
        <p class="tb-hint">加密输出为 OpenSSL 兼容 Base64（内含盐值与 IV），使用同一口令即可解密。</p>
      </div>
    </div>

    <div class="tb-card">
      <div class="tb-row">
        <p class="tb-title tb-grow">文件哈希</p>
        <button type="button" class="tb-btn tb-btn-primary" @click="pickFile">选择文件…</button>
      </div>
      <p v-if="fileInfo" class="tb-hint">{{ fileInfo }}</p>
      <p v-if="fileError" class="tb-error">{{ fileError }}</p>
      <div v-if="fileHashes.length" class="hash-rows">
        <div v-for="row in fileHashes" :key="row.name" class="hash-row">
          <span class="hash-name">{{ row.name }}</span>
          <code class="hash-value">{{ row.value }}</code>
          <button type="button" class="tb-btn tb-btn-mini" title="复制" @click="copy(row.value)">复制</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import CryptoJS from "crypto-js";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import WinTextBox from "@/winui/components/WinTextBox.vue";
import CopyButton from "@/components/CopyButton.vue";
import { writeClipboard } from "@/utils/clipboard";
import { usePersistedInput } from "@/composables/usePersistedInput";

const hasTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const hashInput = usePersistedInput("hash.hashInput");
const cipher = ref<"AES" | "DES">("AES");
const cipherKey = usePersistedInput("hash.cipherKey");
const cipherInput = usePersistedInput("hash.cipherInput");
const cipherOutput = ref("");

const fileInfo = ref("");
const fileError = ref("");
const fileHashes = ref<{ name: string; value: string }[]>([]);

const hashRows = computed(() => {
  const s = hashInput.value;
  if (!s) return [];
  return [
    { name: "MD5", value: CryptoJS.MD5(s).toString() },
    { name: "SHA1", value: CryptoJS.SHA1(s).toString() },
    { name: "SHA256", value: CryptoJS.SHA256(s).toString() },
    { name: "SHA512", value: CryptoJS.SHA512(s).toString() },
  ];
});

async function copy(text: string) {
  await writeClipboard(text);
}

/** 将 Uint8Array 正确转换为 CryptoJS WordArray（否则每个字节会被误当作一个词） */
function bytesToWordArray(bytes: Uint8Array): CryptoJS.lib.WordArray {
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    words[i >>> 2] |= bytes[i] << (24 - (i % 4) * 8);
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length);
}

async function pickFile() {
  fileError.value = "";
  fileInfo.value = "";
  fileHashes.value = [];
  if (!hasTauri) {
    fileError.value = "文件选择仅在 Tauri 应用内可用（浏览器预览不可用）。";
    return;
  }
  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: "所有文件", extensions: ["*"] }],
    });
    if (!selected) return;
    const path = selected as string;
    const data = await readFile(path);
    if (data.byteLength > 200 * 1024 * 1024) {
      fileError.value = "文件过大（>200MB），为避免内存占用请改用命令行工具计算。";
      return;
    }
    const name = path.split(/[\\/]/).pop() ?? path;
    fileInfo.value = `${name}（${(data.byteLength / 1024).toFixed(1)} KB）`;
    const wordArray = bytesToWordArray(data);
    fileHashes.value = [
      { name: "MD5", value: CryptoJS.MD5(wordArray).toString() },
      { name: "SHA1", value: CryptoJS.SHA1(wordArray).toString() },
      { name: "SHA256", value: CryptoJS.SHA256(wordArray).toString() },
      { name: "SHA512", value: CryptoJS.SHA512(wordArray).toString() },
    ];
  } catch (e) {
    fileError.value = `读取失败：${(e as Error).message}`;
  }
}

function doEncrypt() {
  const plain = cipherInput.value;
  const key = cipherKey.value;
  if (!plain || !key) {
    cipherOutput.value = "请输入明文与口令。";
    return;
  }
  try {
    cipherOutput.value =
      cipher.value === "AES"
        ? CryptoJS.AES.encrypt(plain, key).toString()
        : CryptoJS.DES.encrypt(plain, key).toString();
  } catch (e) {
    cipherOutput.value = `加密失败：${(e as Error).message}`;
  }
}

function doDecrypt() {
  const ct = cipherInput.value.trim();
  const key = cipherKey.value;
  if (!ct || !key) {
    cipherOutput.value = "请输入密文与口令。";
    return;
  }
  try {
    const bytes =
      cipher.value === "AES" ? CryptoJS.AES.decrypt(ct, key) : CryptoJS.DES.decrypt(ct, key);
    const text = bytes.toString(CryptoJS.enc.Utf8);
    cipherOutput.value = text || "解密失败：口令错误或密文损坏。";
  } catch (e) {
    cipherOutput.value = `解密失败：${(e as Error).message}`;
  }
}
</script>

<style scoped>
.hash-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hash-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.hash-name {
  flex: none;
  width: 56px;
  font-weight: 600;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}

.hash-value {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: "Cascadia Mono", "Consolas", monospace;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
}

.tb-btn-mini {
  height: 24px;
  padding: 0 10px;
  font-size: 12px;
}
</style>
