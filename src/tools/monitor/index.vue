<template>
  <div class="tb-section monitor-tool">
    <div class="tb-card">
      <div class="tb-row">
        <p class="tb-title tb-grow">硬件监控</p>
        <span class="tb-hint">{{ stats ? "每 2 秒自动刷新 · " + stats.hostname : "" }}</span>
        <button type="button" class="tb-btn" @click="refresh">立即刷新</button>
      </div>
      <p v-if="error" class="tb-error">{{ error }}</p>
    </div>

    <template v-if="stats">
      <div class="monitor-grid">
        <div class="tb-card monitor-card">
          <div class="monitor-head">
            <span class="monitor-name">CPU</span>
            <span class="monitor-value">{{ stats.cpu.toFixed(1) }}%</span>
          </div>
          <div class="monitor-bar"><div class="monitor-bar-fill" :style="{ width: stats.cpu + '%' }" :class="{ 'is-high': stats.cpu > 80 }"></div></div>
        </div>

        <div class="tb-card monitor-card">
          <div class="monitor-head">
            <span class="monitor-name">内存</span>
            <span class="monitor-value">{{ fmtBytes(stats.memUsed) }} / {{ fmtBytes(stats.memTotal) }}</span>
          </div>
          <div class="monitor-bar"><div class="monitor-bar-fill" :style="{ width: memPct + '%' }" :class="{ 'is-high': memPct > 85 }"></div></div>
          <p class="tb-hint">已用 {{ memPct }}%</p>
        </div>

        <div class="tb-card monitor-card">
          <div class="monitor-head">
            <span class="monitor-name">交换分区</span>
            <span class="monitor-value">{{ fmtBytes(stats.swapUsed) }} / {{ fmtBytes(stats.swapTotal) }}</span>
          </div>
          <div class="monitor-bar"><div class="monitor-bar-fill" :style="{ width: swapPct + '%' }"></div></div>
          <p class="tb-hint">已用 {{ swapPct }}%</p>
        </div>

        <div class="tb-card monitor-card">
          <div class="monitor-head">
            <span class="monitor-name">运行时长</span>
            <span class="monitor-value">{{ fmtUptime(stats.uptime) }}</span>
          </div>
          <p class="tb-hint">自系统启动以来</p>
        </div>
      </div>

      <div class="tb-card">
        <p class="tb-title">磁盘</p>
        <div v-for="d in stats.disks" :key="d.mount" class="disk-row">
          <span class="disk-mount">{{ d.mount }}</span>
          <div class="monitor-bar disk-bar">
            <div class="monitor-bar-fill" :style="{ width: diskPct(d) + '%' }" :class="{ 'is-high': diskPct(d) > 90 }"></div>
          </div>
          <span class="disk-info">{{ fmtBytes(d.total - d.available) }} / {{ fmtBytes(d.total) }}（{{ diskPct(d) }}%）</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { invoke } from "@tauri-apps/api/core";

interface DiskInfo {
  mount: string;
  total: number;
  available: number;
}
interface SystemStats {
  cpu: number;
  memTotal: number;
  memUsed: number;
  swapTotal: number;
  swapUsed: number;
  uptime: number;
  hostname: string;
  disks: DiskInfo[];
}

const hasTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const stats = ref<SystemStats | null>(null);
const error = ref("");

const memPct = computed(() => (stats.value && stats.value.memTotal ? Math.round((stats.value.memUsed / stats.value.memTotal) * 100) : 0));
const swapPct = computed(() => (stats.value && stats.value.swapTotal ? Math.round((stats.value.swapUsed / stats.value.swapTotal) * 100) : 0));

function diskPct(d: DiskInfo): number {
  return d.total ? Math.round(((d.total - d.available) / d.total) * 100) : 0;
}

function fmtBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(0)} MB`;
  return `${(n / 1024).toFixed(0)} KB`;
}

function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d > 0 ? `${d} 天 ${h} 小时 ${m} 分` : `${h} 小时 ${m} 分`;
}

async function refresh() {
  if (!hasTauri) {
    error.value = "硬件监控仅 Tauri 应用内可用。";
    return;
  }
  try {
    stats.value = await invoke<SystemStats>("get_system_stats");
    error.value = "";
  } catch (e) {
    error.value = `读取失败：${(e as Error).message}`;
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  void refresh();
  if (hasTauri) timer = setInterval(() => void refresh(), 2000);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.monitor-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.monitor-card {
  gap: 10px;
}

.monitor-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.monitor-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
}

.monitor-value {
  font-size: 13px;
  color: var(--accent-base, #0067c0);
  font-family: "Cascadia Mono", "Consolas", monospace;
}

.monitor-bar {
  height: 8px;
  border-radius: 4px;
  background: var(--ctrl-fill-tertiary, rgba(0, 0, 0, 0.12));
  overflow: hidden;
}

.monitor-bar-fill {
  height: 100%;
  border-radius: 4px;
  background: var(--accent-base, #0067c0);
  transition: width 600ms ease;
}

.monitor-bar-fill.is-high {
  background: #c42b1c;
}

.disk-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
}

.disk-mount {
  flex: none;
  width: 48px;
  font-family: "Cascadia Mono", "Consolas", monospace;
  font-size: 13px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}

.disk-bar {
  flex: 1 1 auto;
  min-width: 0;
}

.disk-info {
  flex: none;
  font-size: 12px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
  font-family: "Cascadia Mono", "Consolas", monospace;
}
</style>
