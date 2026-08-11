<template>
  <div class="tb-section network-tool">
    <div class="tb-two-col">
      <div class="tb-card">
        <p class="tb-title">本机 IP</p>
        <div class="tb-row">
          <button type="button" class="tb-btn tb-btn-primary" @click="scanLocal">刷新</button>
          <span v-if="scanning" class="tb-hint">正在探测…</span>
        </div>
        <div class="ip-list">
          <div v-for="ip in localIps" :key="ip" class="ip-item">
            <span class="ip-dot" aria-hidden="true"></span>
            <code class="ip-value">{{ ip }}</code>
          </div>
          <p v-if="!localIps.length && !scanning" class="tb-hint">未探测到 IPv4，请点击“刷新”重试。</p>
        </div>
        <div class="tb-row">
          <span class="tb-row-label">主机名</span>
          <code class="tb-hint">{{ hostname }}</code>
        </div>
        <p class="tb-hint">说明：IP 探测基于 WebRTC 候选地址，仅显示本机局域网地址；公网 IP、Ping 与端口检测需要网络/Rust 支持，规划在后续版本。</p>
      </div>

      <div class="tb-card">
        <p class="tb-title">子网计算（CIDR）</p>
        <div class="tb-row">
          <WinTextBox v-model:Text="cidrInput" PlaceholderText="例如 192.168.1.0/24" class="tb-grow" Height="38" />
          <button type="button" class="tb-btn tb-btn-primary" @click="calc">计算</button>
        </div>
        <p v-if="subnetError" class="tb-error">{{ subnetError }}</p>
        <div v-if="subnet" class="subnet-list">
          <div v-for="row in subnetRows" :key="row.label" class="subnet-row">
            <span class="subnet-label">{{ row.label }}</span>
            <code class="subnet-value">{{ row.value }}</code>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import WinTextBox from "@/winui/components/WinTextBox.vue";

const localIps = ref<string[]>([]);
const scanning = ref(false);
const hostname = computed(() => (typeof window !== "undefined" ? window.location.hostname : ""));

function scanLocal() {
  scanning.value = true;
  const ips = new Set<string>();
  let pc: RTCPeerConnection | null = null;
  const timer = setTimeout(() => {
    pc?.close();
    scanning.value = false;
    localIps.value = [...ips];
  }, 2500);

  try {
    pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel("");
    pc.createOffer()
      .then((offer) => pc?.setLocalDescription(offer))
      .catch(() => {});
    pc.onicecandidate = (e) => {
      if (!e.candidate) {
        clearTimeout(timer);
        pc?.close();
        scanning.value = false;
        localIps.value = [...ips];
        return;
      }
      const m = /([0-9]{1,3}(?:\.[0-9]{1,3}){3})/.exec(e.candidate.candidate ?? "");
      if (m && m[1] !== "0.0.0.0" && !m[1].startsWith("127.")) ips.add(m[1]);
    };
  } catch {
    clearTimeout(timer);
    scanning.value = false;
    localIps.value = [];
  }
}

// ---- 子网计算 ----
const cidrInput = ref("192.168.1.0/24");
const subnetError = ref("");
const subnet = ref<Record<string, string> | null>(null);

function ipv4ToLong(ip: string): number | null {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return null;
  return ((((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0));
}

function longToIpv4(n: number): string {
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}

function calc() {
  subnetError.value = "";
  subnet.value = null;
  const m = /^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/.exec(cidrInput.value.trim());
  if (!m) {
    subnetError.value = "格式应为 IP/CIDR，例如 192.168.1.0/24。";
    return;
  }
  const ip = ipv4ToLong(m[1]);
  const prefix = Number(m[2]);
  if (ip === null || prefix > 32) {
    subnetError.value = "IP 或前缀无效。";
    return;
  }
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = ip & mask;
  const broadcast = network | (~mask >>> 0);
  const hosts = prefix >= 31 ? (prefix === 32 ? 1 : 2) : Math.max(0, broadcast - network - 1);

  subnet.value = {
    网络地址: `${longToIpv4(network)}/${prefix}`,
    子网掩码: longToIpv4(mask),
    广播地址: longToIpv4(broadcast),
    可用地址: prefix >= 31 ? `${longToIpv4(network)}` : `${longToIpv4(network + 1)} ~ ${longToIpv4(broadcast - 1)}`,
    可用主机数: prefix >= 31 ? `${hosts}` : `${hosts}（含网关则 ${hosts - 1}）`,
  };
}

const subnetRows = computed(() =>
  subnet.value ? Object.entries(subnet.value).map(([label, value]) => ({ label, value })) : []
);
</script>

<style scoped>
.ip-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.ip-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ip-dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #0f7b0f;
}

.ip-value {
  font-family: "Cascadia Mono", "Consolas", monospace;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
}

.subnet-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.subnet-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  font-size: 13px;
}

.subnet-label {
  flex: none;
  width: 72px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}

.subnet-value {
  font-family: "Cascadia Mono", "Consolas", monospace;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
  word-break: break-all;
}
</style>
