<template>
  <div class="tb-section port-tool">
    <div class="tb-card">
      <div class="tb-row">
        <p class="tb-title tb-grow">端口占用查询</p>
        <WinTextBox v-model:Text="portInput" PlaceholderText="输入端口号，如 8080（留空查全部）" class="tb-grow" Height="38" />
        <button type="button" class="tb-btn tb-btn-primary" :disabled="busy" @click="query">查询</button>
        <button type="button" class="tb-btn" :disabled="busy" @click="loadAll">刷新</button>
      </div>
      <p v-if="error" class="tb-error">{{ error }}</p>
      <p class="tb-hint">共 {{ rows.length }} 条连接。部分系统进程结束需要管理员权限。</p>
    </div>

    <div class="tb-card">
      <div class="port-table-wrap">
        <table class="port-table">
          <thead>
            <tr>
              <th>协议</th>
              <th>本地地址</th>
              <th>远程地址</th>
              <th>状态</th>
              <th>PID</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, i) in rows" :key="i">
              <td>{{ p.protocol }}</td>
              <td class="port-addr">{{ p.localAddress }}</td>
              <td class="port-addr">{{ p.remoteAddress }}</td>
              <td>{{ p.state }}</td>
              <td>{{ p.pid }}</td>
              <td>
                <button
                  v-if="p.pid > 0"
                  type="button"
                  class="tb-btn tb-btn-mini port-kill"
                  :disabled="killing === p.pid"
                  @click="kill(p.pid)">
                  {{ killing === p.pid ? "结束中…" : "结束" }}
                </button>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td colspan="6" class="port-empty">无匹配结果，请先查询或刷新。</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import WinTextBox from "@/winui/components/WinTextBox.vue";
import { invoke } from "@tauri-apps/api/core";

interface PortInfo {
  protocol: string;
  localAddress: string;
  remoteAddress: string;
  state: string;
  pid: number;
}

const hasTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const portInput = ref("");
const rows = ref<PortInfo[]>([]);
const busy = ref(false);
const killing = ref<number | null>(null);
const error = ref("");

async function query() {
  if (!hasTauri) {
    error.value = "端口查询仅 Tauri 应用内可用。";
    return;
  }
  busy.value = true;
  error.value = "";
  try {
    const all = await invoke<PortInfo[]>("list_ports");
    const q = portInput.value.trim();
    rows.value = q
      ? all.filter((p) => p.localAddress.includes(`:${q}`) || p.remoteAddress.includes(`:${q}`))
      : all;
  } catch (e) {
    error.value = `查询失败：${(e as Error).message}`;
    rows.value = [];
  } finally {
    busy.value = false;
  }
}

async function loadAll() {
  portInput.value = "";
  await query();
}

async function kill(pid: number) {
  if (!hasTauri) return;
  killing.value = pid;
  error.value = "";
  try {
    await invoke("kill_process", { pid });
    await query();
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    killing.value = null;
  }
}
</script>

<style scoped>
.port-table-wrap {
  overflow: auto;
  max-height: 480px;
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  border-radius: 6px;
}

.port-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
  font-family: "Cascadia Mono", "Consolas", monospace;
}

.port-table th,
.port-table td {
  padding: 6px 12px;
  border-bottom: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  text-align: left;
  white-space: nowrap;
}

.port-table th {
  position: sticky;
  top: 0;
  background: var(--ctrl-fill-secondary, rgba(249, 249, 249, 0.9));
  font-weight: 600;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}

.port-addr {
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
}

.port-empty {
  text-align: center;
  color: var(--text-tertiary, rgba(0, 0, 0, 0.4458));
}

.tb-btn-mini {
  height: 24px;
  padding: 0 10px;
  font-size: 12px;
}

.port-kill {
  color: #c42b1c;
  border-color: color-mix(in srgb, #c42b1c 30%, transparent);
}
</style>
