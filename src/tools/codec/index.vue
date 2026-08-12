<template>
  <div class="tb-section codec-tool">
    <div class="tb-row">
      <div class="nb-segmented" role="tablist" aria-label="编码类型">
        <button
          v-for="c in codecs"
          :key="c.value"
          type="button"
          class="nb-segmented-item"
          :class="{ 'is-active': codec === c.value }"
          @click="codec = c.value">
          {{ c.label }}
        </button>
      </div>
      <label v-if="codec === 'url'" class="nb-check">
        <input v-model="preserveUrl" type="checkbox" />
        保留 URI 结构（encodeURI）
      </label>
    </div>

    <div class="tb-card">
      <div class="tb-row">
        <p class="tb-title tb-grow">输入</p>
        <button type="button" class="tb-btn tb-btn-primary" @click="encode">编码</button>
        <button type="button" class="tb-btn" @click="decode">解码</button>
        <button type="button" class="tb-btn" @click="swap">交换输入输出</button>
        <button type="button" class="tb-btn" @click="clear">清空</button>
      </div>
      <WinTextBox
        v-model:Text="input"
        PlaceholderText="在此输入需要编码 / 解码的内容…"
        AcceptsReturn
        TextWrapping="Wrap"
        Height="180" />
    </div>

    <div class="tb-card">
      <div class="tb-row">
        <p class="tb-title tb-grow">输出</p>
        <CopyButton :text="output" />
      </div>
      <WinTextBox
        v-model:Text="output"
        PlaceholderText="结果将显示在这里…"
        AcceptsReturn
        TextWrapping="Wrap"
        IsReadOnly
        Height="180" />
      <p v-if="error" class="tb-error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import WinTextBox from "@/winui/components/WinTextBox.vue";
import CopyButton from "@/components/CopyButton.vue";
import { usePersistedInput } from "@/composables/usePersistedInput";

type CodecType = "base64" | "url" | "html";

const codecs: { value: CodecType; label: string }[] = [
  { value: "base64", label: "Base64" },
  { value: "url", label: "URL" },
  { value: "html", label: "HTML" },
];

const codec = ref<CodecType>("base64");
const preserveUrl = ref(false);
const input = usePersistedInput("codec.input");
const output = ref("");
const error = ref("");

function utf8ToBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function base64ToUtf8(s: string): string {
  const bin = atob(s.trim());
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function htmlEncode(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

function htmlDecode(s: string): string {
  const ta = document.createElement("textarea");
  ta.innerHTML = s;
  return ta.value;
}

function encode() {
  error.value = "";
  try {
    const s = input.value;
    switch (codec.value) {
      case "base64":
        output.value = utf8ToBase64(s);
        break;
      case "url":
        output.value = preserveUrl.value ? encodeURI(s) : encodeURIComponent(s);
        break;
      case "html":
        output.value = htmlEncode(s);
        break;
    }
  } catch (e) {
    error.value = `编码失败：${(e as Error).message}`;
    output.value = "";
  }
}

function decode() {
  error.value = "";
  try {
    const s = input.value.trim();
    switch (codec.value) {
      case "base64":
        output.value = base64ToUtf8(s);
        break;
      case "url":
        output.value = preserveUrl.value ? decodeURI(s) : decodeURIComponent(s);
        break;
      case "html":
        output.value = htmlDecode(s);
        break;
    }
  } catch (e) {
    error.value = `解码失败：${(e as Error).message}`;
    output.value = "";
  }
}

function swap() {
  const tmp = input.value;
  input.value = output.value;
  output.value = tmp;
}

function clear() {
  input.value = "";
  output.value = "";
  error.value = "";
}
</script>
