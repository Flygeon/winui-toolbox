<template>
  <div class="tb-section qrcode-tool">
    <div class="tb-two-col">
      <div class="tb-card">
        <p class="tb-title">内容</p>
        <div class="nb-segmented" role="tablist" aria-label="二维码类型">
          <button
            type="button"
            class="nb-segmented-item"
            :class="{ 'is-active': qrType === 'text' }"
            @click="qrType = 'text'">文本 / 网址</button>
          <button
            type="button"
            class="nb-segmented-item"
            :class="{ 'is-active': qrType === 'wifi' }"
            @click="qrType = 'wifi'">Wi-Fi</button>
        </div>

        <template v-if="qrType === 'text'">
          <WinTextBox
            v-model:Text="qrText"
            PlaceholderText="输入文本或网址，例如 https://example.com"
            AcceptsReturn
            TextWrapping="Wrap"
            Height="96" />
          <div class="tb-row">
            <span class="tb-hint">快捷：</span>
            <button type="button" class="tb-chip" @click="qrText = 'https://github.com'">GitHub</button>
            <button type="button" class="tb-chip" @click="qrText = 'https://www.bing.com'">Bing</button>
          </div>
        </template>

        <template v-else>
          <div class="tb-row">
            <span class="tb-row-label">SSID</span>
            <WinTextBox v-model:Text="wifi.ssid" PlaceholderText="Wi-Fi 名称" class="tb-grow" Height="38" />
          </div>
          <div class="tb-row">
            <span class="tb-row-label">密码</span>
            <WinTextBox v-model:Text="wifi.password" PlaceholderText="Wi-Fi 密码（留空表示无密码）" class="tb-grow" Height="38" />
          </div>
          <div class="tb-row">
            <span class="tb-row-label">加密</span>
            <select v-model="wifi.encryption" class="nb-select">
              <option value="WPA">WPA / WPA2</option>
              <option value="WEP">WEP</option>
              <option value="nopass">无密码</option>
            </select>
          </div>
        </template>

        <div class="tb-row">
          <span class="tb-row-label">容错</span>
          <select v-model="ecLevel" class="nb-select">
            <option value="L">L（约 7%）</option>
            <option value="M">M（约 15%）</option>
            <option value="Q">Q（约 25%）</option>
            <option value="H">H（约 30%）</option>
          </select>
        </div>
        <div class="tb-row">
          <span class="tb-row-label">尺寸</span>
          <input v-model.number="qrSize" type="range" min="160" max="640" step="16" class="nb-range" />
          <span class="tb-hint">{{ qrSize }}px</span>
        </div>
      </div>

      <div class="tb-card">
        <p class="tb-title">预览</p>
        <div class="qr-preview">
          <img v-if="qrDataUrl" :src="qrDataUrl" alt="二维码" class="qr-image" />
          <p v-else class="tb-hint">输入内容后将自动生成…</p>
        </div>
        <div class="tb-row">
          <a
            v-if="qrDataUrl"
            :href="qrDataUrl"
            download="qrcode.png"
            class="tb-btn tb-btn-primary qr-download">下载 PNG</a>
          <p v-if="qrError" class="tb-error">{{ qrError }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import QRCode from "qrcode";
import WinTextBox from "@/winui/components/WinTextBox.vue";

const qrType = ref<"text" | "wifi">("text");
const qrText = ref("https://example.com");
const wifi = reactive({ ssid: "", password: "", encryption: "WPA" });
const ecLevel = ref<"L" | "M" | "Q" | "H">("M");
const qrSize = ref(320);

const qrDataUrl = ref("");
const qrError = ref("");

function buildContent(): string {
  if (qrType.value === "text") return qrText.value;
  const enc = wifi.encryption;
  if (enc === "nopass") return `WIFI:T:nopass;S:${wifi.ssid};;`;
  return `WIFI:T:${enc};S:${wifi.ssid};P:${wifi.password};;`;
}

async function generate() {
  qrError.value = "";
  const content = buildContent();
  if (!content) {
    qrDataUrl.value = "";
    return;
  }
  try {
    qrDataUrl.value = await QRCode.toDataURL(content, {
      errorCorrectionLevel: ecLevel.value,
      margin: 2,
      width: qrSize.value,
    });
  } catch (e) {
    qrError.value = `生成失败：${(e as Error).message}`;
    qrDataUrl.value = "";
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(generate, 150);
}

watch([qrType, qrText, () => wifi.ssid, () => wifi.password, () => wifi.encryption, ecLevel, qrSize], schedule);
</script>

<style scoped>
.nb-range {
  width: 180px;
  accent-color: var(--accent-base, #0067c0);
}

.qr-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  background: var(--card-bg-secondary, rgba(246, 246, 246, 0.5));
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  border-radius: 8px;
  padding: 16px;
}

.qr-image {
  width: 100%;
  max-width: 320px;
  image-rendering: pixelated;
  border-radius: 4px;
  background: #ffffff;
}

.qr-download {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}
</style>
