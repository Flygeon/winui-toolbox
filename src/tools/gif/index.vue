<template>
  <div class="tb-section gif-tool">
    <FfmpegGate v-if="ffmpegReady === false" />
    <template v-else>
      <div class="tb-card">
        <div class="tb-row">
          <p class="tb-title tb-grow">视频转 GIF</p>
          <button type="button" class="tb-btn tb-btn-primary" @click="pickInput">选择视频…</button>
          <button type="button" class="tb-btn" @click="pickOutput" :disabled="!inputPath">选择输出位置…</button>
        </div>
        <p v-if="inputPath" class="tb-hint">输入：{{ inputName }}</p>
        <p v-if="outputPath" class="tb-hint">输出：{{ outputPath }}</p>
      </div>

      <div class="tb-card">
        <p class="tb-title">选项</p>
        <div class="tb-row">
          <span class="tb-row-label">帧率</span>
          <select v-model="fps" class="nb-select">
            <option :value="5">5 fps</option>
            <option :value="10">10 fps</option>
            <option :value="15">15 fps</option>
            <option :value="20">20 fps</option>
            <option :value="30">30 fps</option>
          </select>
          <span class="tb-row-label">宽度</span>
          <select v-model="width" class="nb-select">
            <option :value="360">360px</option>
            <option :value="480">480px</option>
            <option :value="640">640px</option>
            <option :value="800">800px</option>
          </select>
          <span class="tb-row-label">时长</span>
          <WinTextBox v-model:Text="maxDuration" PlaceholderText="秒（留空=全片）" class="gif-duration" Height="36" />
        </div>
        <p class="tb-hint">帧率越高、宽度越大，GIF 文件越大。建议 10–15 fps、480px 以获得体积与画质平衡。</p>
      </div>

      <div class="tb-card">
        <div class="tb-row">
          <button type="button" class="tb-btn tb-btn-primary" :disabled="busy || !canRun" @click="convert">
            {{ busy ? "转换中…（请勿关闭）" : "生成 GIF" }}
          </button>
          <span v-if="busy" class="tb-hint">正在调用本地 FFmpeg 处理…</span>
        </div>
        <p v-if="error" class="tb-error">{{ error }}</p>
        <DownloadedBar :path="done ? outputPath : null" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import WinTextBox from "@/winui/components/WinTextBox.vue";
import FfmpegGate from "@/components/FfmpegGate.vue";
import DownloadedBar from "@/components/DownloadedBar.vue";
import { open, save } from "@tauri-apps/plugin-dialog";
import { join } from "@tauri-apps/api/path";
import { useSettingsStore } from "@/stores/settings";
import { resolveFfmpeg, runFfmpeg, FFMPEG_MISSING } from "@/utils/ffmpeg";

const settings = useSettingsStore();
const hasTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const ffmpegReady = ref<boolean | null>(null);
const inputPath = ref("");
const outputPath = ref("");
const fps = ref(12);
const width = ref(480);
const maxDuration = ref("");
const busy = ref(false);
const error = ref("");
const done = ref(false);

const inputName = computed(() => inputPath.value.split(/[\\/]/).pop() ?? inputPath.value);
const canRun = computed(() => !!inputPath.value && !!outputPath.value);

async function pickInput() {
  if (!hasTauri) return;
  const sel = await open({
    multiple: false,
    filters: [{ name: "视频", extensions: ["mp4", "mkv", "avi", "webm", "mov", "flv", "wmv", "ts"] }],
  });
  if (sel) {
    inputPath.value = sel as string;
    done.value = false;
    error.value = "";
    await autoFillOutput();
  }
}

async function autoFillOutput() {
  if (!inputPath.value || !settings.downloadDir) return;
  const base = inputName.value.split(".").slice(0, -1).join(".") || "video";
  outputPath.value = await join(settings.downloadDir, `${base}.gif`);
}

async function pickOutput() {
  if (!hasTauri || !inputPath.value) return;
  const base = inputName.value.split(".").slice(0, -1).join(".") || "video";
  const defaultPath = outputPath.value || (settings.downloadDir ? await join(settings.downloadDir, `${base}.gif`) : `${base}.gif`);
  const sel = await save({
    defaultPath,
    filters: [{ name: "GIF", extensions: ["gif"] }],
  });
  if (sel) {
    outputPath.value = sel as string;
    done.value = false;
  }
}

async function convert() {
  error.value = "";
  done.value = false;
  try {
    const args = ["-y", "-i", inputPath.value];
    const dur = maxDuration.value.trim();
    if (/^\d+$/.test(dur)) args.push("-t", dur);
    args.push("-vf", `fps=${fps.value},scale=${width.value}:-1:flags=lanczos`, "-loop", "0", outputPath.value);
    busy.value = true;
    const result = await runFfmpeg(args);
    if (result.code === 0) {
      done.value = true;
    } else {
      error.value = `FFmpeg 转换失败（退出码 ${result.code}）。\n${result.stderr.split("\n").slice(-5).join("\n")}`;
    }
  } catch (e) {
    error.value = (e as Error).message === FFMPEG_MISSING ? FFMPEG_MISSING : (e as Error).message;
  } finally {
    busy.value = false;
  }
}

onMounted(async () => {
  ffmpegReady.value = !!(await resolveFfmpeg());
});
</script>

<style scoped>
.gif-duration {
  width: 120px;
  flex: none;
}
</style>
