<template>
  <div class="tb-section jwt-tool">
    <div class="tb-card">
      <p class="tb-title">JWT 调试</p>
      <WinTextBox
        v-model:Text="token"
        PlaceholderText="粘贴 JWT（三部分：header.payload.signature）…"
        AcceptsReturn
        TextWrapping="Wrap"
        Height="120" />
      <p v-if="result.error" class="tb-error">{{ result.error }}</p>
    </div>

    <template v-if="result.claims">
      <div class="tb-two-col">
        <div class="tb-card">
          <div class="tb-row">
            <p class="tb-title tb-grow">Header</p>
            <CopyButton :text="result.header" />
          </div>
          <div class="tb-output">{{ result.header }}</div>
        </div>

        <div class="tb-card">
          <div class="tb-row">
            <p class="tb-title tb-grow">Payload</p>
            <CopyButton :text="result.payload" />
          </div>
          <div class="tb-output">{{ result.payload }}</div>
        </div>
      </div>

      <div class="tb-card">
        <p class="tb-title">注册声明</p>
        <div class="claims-grid">
          <div v-for="c in claimsList" :key="c.label" class="claim-row">
            <span class="claim-label">{{ c.label }}</span>
            <span class="claim-value">{{ c.value }}</span>
          </div>
        </div>
        <p class="tb-hint">签名（Signature）：<code>{{ result.signature }}</code></p>
      </div>

      <div class="tb-card">
        <div class="tb-row">
          <p class="tb-title tb-grow">HS256 签名校验</p>
          <WinTextBox
            v-model:Text="secret"
            PlaceholderText="输入 HS256 密钥…"
            class="secret-input"
            Height="38" />
          <button type="button" class="tb-btn tb-btn-primary" :disabled="!isHs256" @click="verify">校验</button>
        </div>
        <p v-if="verifyState" class="verify-state" :class="verifyOk ? 'is-ok' : 'is-bad'">{{ verifyState }}</p>
        <p v-if="!isHs256" class="tb-hint">仅支持 HS256（非对称签名请在本地信任的库中校验）。</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import CryptoJS from "crypto-js";
import WinTextBox from "@/winui/components/WinTextBox.vue";
import CopyButton from "@/components/CopyButton.vue";
import { usePersistedInput } from "@/composables/usePersistedInput";

const token = usePersistedInput("jwt.token");
const secret = usePersistedInput("jwt.secret");
const verifyState = ref("");
const verifyOk = ref(false);

interface JwtResult {
  header: string;
  payload: string;
  signature: string;
  claims: Record<string, unknown>;
  error?: string;
}

const result = ref<JwtResult>({ header: "", payload: "", signature: "", claims: {} });

function b64urlDecode(s: string): string {
  let b = s.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  const bin = atob(b);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function decode() {
  verifyState.value = "";
  const t = token.value.trim();
  if (!t) {
    result.value = { header: "", payload: "", signature: "", claims: {} };
    return;
  }
  const parts = t.split(".");
  if (parts.length !== 3) {
    result.value = {
      header: "",
      payload: "",
      signature: "",
      claims: {},
      error: "JWT 格式不正确：应包含 header.payload.signature 三段（用点分隔）。",
    };
    return;
  }
  try {
    const header = JSON.parse(b64urlDecode(parts[0]));
    const payload = JSON.parse(b64urlDecode(parts[1]));
    result.value = {
      header: JSON.stringify(header, null, 2),
      payload: JSON.stringify(payload, null, 2),
      signature: parts[2],
      claims: payload,
    };
  } catch (e) {
    result.value = {
      header: "",
      payload: "",
      signature: "",
      claims: {},
      error: `解码失败：${(e as Error).message}`,
    };
  }
}

function fmtTs(v: unknown): string {
  if (typeof v !== "number") return "—";
  const d = new Date(v * 1000);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toISOString()}（已${v * 1000 > Date.now() ? "生效" : "过期"}）`;
}

const claimsList = computed(() => {
  const c = result.value.claims;
  return [
    { label: "iss（签发者）", value: String(c.iss ?? "—") },
    { label: "sub（主题）", value: String(c.sub ?? "—") },
    { label: "aud（受众）", value: Array.isArray(c.aud) ? c.aud.join(", ") : String(c.aud ?? "—") },
    { label: "iat（签发时间）", value: fmtTs(c.iat) },
    { label: "exp（过期时间）", value: fmtTs(c.exp) },
    { label: "nbf（生效时间）", value: fmtTs(c.nbf) },
  ];
});

const isHs256 = computed(() => {
  try {
    const h = JSON.parse(result.value.header || "{}");
    return (h.alg ?? "") === "HS256";
  } catch {
    return false;
  }
});

function verify() {
  if (!isHs256.value || !secret.value) return;
  const parts = token.value.trim().split(".");
  const signedData = `${parts[0]}.${parts[1]}`;
  const computedSig = CryptoJS.HmacSHA256(signedData, secret.value)
    .toString(CryptoJS.enc.Base64)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const ok = computedSig === parts[2];
  verifyOk.value = ok;
  verifyState.value = ok
    ? "✓ 签名一致，Token 未被篡改。"
    : "✗ 签名不一致：密钥错误或 Token 已被篡改。";
}

watch(token, decode);
</script>

<style scoped>
.secret-input {
  min-width: 220px;
}

.claims-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.claim-row {
  display: flex;
  gap: 12px;
  font-size: 13px;
}

.claim-label {
  flex: none;
  width: 140px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}

.claim-value {
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
  word-break: break-all;
}

.verify-state {
  font-size: 13px;
  font-weight: 500;
  margin: 4px 0 0;
}

.verify-state.is-ok {
  color: #0f7b0f;
}

.verify-state.is-bad {
  color: #c42b1c;
}
</style>
