<template>
  <div class="tb-section env-tool">
    <div class="tb-card">
      <div class="tb-row">
        <p class="tb-title tb-grow">用户环境变量</p>
        <button type="button" class="tb-btn" :disabled="busy" @click="refresh">刷新</button>
        <button type="button" class="tb-btn" :disabled="!vars.length" @click="exportAll">导出备份</button>
      </div>
      <p class="tb-hint">修改用户环境变量（HKCU\Environment）。setx 值长度限约 1024 字符；删除后已运行的程序需重启或重新登录才生效。</p>
      <p v-if="error" class="tb-error">{{ error }}</p>
      <p v-if="ok" class="env-ok">{{ ok }}</p>
    </div>

    <div class="tb-card">
      <p class="tb-title">{{ editing ? `编辑：${editing.name}` : "新增变量" }}</p>
      <div class="tb-row">
        <WinTextBox
          v-model:Text="formName"
          PlaceholderText="变量名，如 MY_TOOL"
          class="env-name"
          Height="36"
          :IsEnabled="!editing" />
        <WinTextBox
          v-model:Text="formValue"
          PlaceholderText="变量值"
          class="tb-grow"
          Height="36" />
        <button type="button" class="tb-btn tb-btn-primary" :disabled="busy || !formName.trim()" @click="save">
          {{ editing ? "保存修改" : "添加" }}
        </button>
        <button v-if="editing" type="button" class="tb-btn" @click="cancelEdit">取消</button>
      </div>
    </div>

    <div class="tb-card">
      <div class="env-table-wrap">
        <table class="env-table">
          <thead>
            <tr><th>变量名</th><th>值</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="v in vars" :key="v.name">
              <td class="env-name-cell">{{ v.name }}</td>
              <td class="env-value-cell" :title="v.value">{{ v.value }}</td>
              <td class="env-actions">
                <button type="button" class="tb-btn tb-btn-mini" @click="startEdit(v)">编辑</button>
                <button type="button" class="tb-btn tb-btn-mini env-del" :disabled="busy" @click="remove(v.name)">删除</button>
              </td>
            </tr>
            <tr v-if="!vars.length">
              <td colspan="3" class="env-empty">暂无用户环境变量。</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import WinTextBox from "@/winui/components/WinTextBox.vue";
import { invoke } from "@tauri-apps/api/core";
import { downloadText } from "@/utils/download";

interface EnvVar {
  name: string;
  value: string;
}

const hasTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const vars = ref<EnvVar[]>([]);
const editing = ref<EnvVar | null>(null);
const formName = ref("");
const formValue = ref("");
const busy = ref(false);
const error = ref("");
const ok = ref("");

async function refresh() {
  if (!hasTauri) {
    error.value = "环境变量管理仅 Tauri 应用内可用。";
    return;
  }
  busy.value = true;
  error.value = "";
  try {
    vars.value = await invoke<EnvVar[]>("list_user_env_vars");
  } catch (e) {
    error.value = `读取失败：${(e as Error).message}`;
  } finally {
    busy.value = false;
  }
}

async function save() {
  const name = editing.value ? editing.value.name : formName.value.trim();
  const value = formValue.value;
  if (!name) return;
  busy.value = true;
  error.value = "";
  ok.value = "";
  try {
    await invoke("set_user_env_var", { name, value });
    ok.value = `已保存 ${name}`;
    cancelEdit();
    await refresh();
  } catch (e) {
    error.value = `保存失败：${(e as Error).message}`;
  } finally {
    busy.value = false;
  }
}

function startEdit(v: EnvVar) {
  editing.value = v;
  formName.value = v.name;
  formValue.value = v.value;
  ok.value = "";
}

function cancelEdit() {
  editing.value = null;
  formName.value = "";
  formValue.value = "";
}

async function remove(name: string) {
  if (!confirm(`确定删除环境变量 ${name} 吗？`)) return;
  busy.value = true;
  error.value = "";
  ok.value = "";
  try {
    await invoke("delete_user_env_var", { name });
    ok.value = `已删除 ${name}`;
    if (editing.value?.name === name) cancelEdit();
    await refresh();
  } catch (e) {
    error.value = `删除失败：${(e as Error).message}`;
  } finally {
    busy.value = false;
  }
}

function exportAll() {
  const lines = vars.value.map((v) => `${v.name}=${v.value}`);
  downloadText(lines.join("\n"), "env-backup.txt");
}

onMounted(refresh);
</script>

<style scoped>
.env-name {
  width: 200px;
  flex: none;
}

.env-table-wrap {
  overflow: auto;
  max-height: 420px;
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  border-radius: 6px;
}

.env-table {
  border-collapse: collapse;
  width: 100%;
  font-size: 13px;
}

.env-table th,
.env-table td {
  padding: 7px 12px;
  border-bottom: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  text-align: left;
}

.env-table th {
  position: sticky;
  top: 0;
  background: var(--ctrl-fill-secondary, rgba(249, 249, 249, 0.9));
  font-weight: 600;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}

.env-name-cell {
  width: 220px;
  font-family: "Cascadia Mono", "Consolas", monospace;
  font-weight: 600;
  color: var(--accent-base, #0067c0);
  word-break: break-all;
}

.env-value-cell {
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
  word-break: break-all;
}

.env-actions {
  width: 130px;
  white-space: nowrap;
  text-align: right;
}

.tb-btn-mini {
  height: 24px;
  padding: 0 10px;
  font-size: 12px;
  margin-left: 6px;
}

.env-del {
  color: #c42b1c;
}

.env-empty {
  text-align: center;
  color: var(--text-tertiary, rgba(0, 0, 0, 0.4458));
}

.env-ok {
  color: #0f7b0f;
  font-size: 13px;
}
</style>
