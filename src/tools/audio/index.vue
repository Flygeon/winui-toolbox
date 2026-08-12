<template>
  <div class="tb-section audio-tool">
    <FfmpegGate v-if="ffmpegReady === false" />
    <template v-else>
      <div class="tb-card">
        <div class="tb-row">
          <p class="tb-title tb-grow">音频格式转换</p>
          <button type="button" class="tb-btn tb-btn-primary" @click="pickInput">选择文件…</button>
          <button type="button" class="tb-btn" @click="pickOutput" :disabled="!inputPath">选择输出位置…</button>
        </div>
        <p v-if="inputPath" class="tb-hint">输入：{{ inputName }}</p>
        <p v-if="outputPath" class="tb-hint">输出：{{ outputPath }}</p>
      </div>

      <div class="tb-card">
        <p class="tb-title">选项</p>
        <div class="tb-row">
          <span class="tb-row-label">格式</span>
          <select v-model="format" class="nb-select">
            <option v-for="f in formats" :key="f.value" :value="f.value">{{ f.label }}</option>
          </select>
          <span class="tb-row-label">码率</span>
          <select v-model="bitrate" class="nb-select" :disabled="isLossless">
            <option :value="128">128 kbps</option>
            <option :value="192">192 kbps</option>
            <option :value="256">256 kbps</option>
            <option :value="320">320 kbps</option>
          </select>
        </div>
        <p v-if="isLossless" class="tb-hint">当前格式为无损（WAV / FLAC），码率设置不适用。</p>
      </div>

      <div class="tb-card">
        <div class="tb-row">
          <button type="button" class="tb-btn tb-btn-primary" :disabled="busy || !canRun" @click="convert">
            {{ busy ? "转换中…（请勿关闭）" : "开始转换" }}
          </button>
          <span v-if="busy" class="tb-hint">正在调用本地 FFmpeg 处理…</span>
        </div>
        <p v-if="error" class="tb-error">{{ error }}</p>
        <p v-if="done" class="audio-done">✓ 转换完成：{{ outputPath }}</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import FfmpegGate from "@/components/FfmpegGate.vue";
import { open, save } from "@tauri-apps/plugin-dialog";
import { resolveFfmpeg, runFfmpeg, FFMPEG_MISSING } from "@/utils/ffmpeg";

const hasTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const ffmpegReady = ref<boolean | null>(null);
const inputPath = ref("");
const outputPath = ref("");
const format = ref("mp3");
const bitrate = ref(192);
const busy = ref(false);
const error = ref("");
const done = ref(false);

const formats = [
  { value: "mp3", label: "MP3（通用）" },
  { value: "wav", label: "WAV（无损 PCM）" },
  { value: "flac", label: "FLAC（无损）" },
  { value: "aac", label: "AAC" },
  { value: "ogg", label: "OGG（Vorbis）" },
  { value: "m4a", label: "M4A（AAC）" },
];

const isLossless = computed(() => format.value === "wav" || format.value === "flac");
const inputName = computed(() => inputPath.value.split(/[\\/]/).pop() ?? inputPath.value);
const canRun = computed(() => !!inputPath.value && !!outputPath.value);

function audioArgs(): string[] {
  const args = ["-y", "-i", inputPath.value, "-vn"];
  switch (format.value) {
    case "mp3":
      args.push("-c:a", "libmp3lame", "-b:a", `${bitrate.value}k`);
      break;
    case "wav":
      args.push("-c:a", "pcm_s16le");
      break;
    case "flac":
      args.push("-c:a", "flac");
      break;
    case "aac":
      args.push("-c:a", "aac", "-b:a", `${bitrate.value}k`);
      break;
    case "ogg":
      args.push("-c:a", "libvorbis", "-q:a", "4");
      break;
    case "m4a":
      args.push("-c:a", "aac", "-b:a", `${bitrate.value}k`);
      break;
  }
  args.push(outputPath.value);
  return args;
}

async function pickInput() {
  if (!hasTauri) return;
  const sel = await open({
    multiple: false,
    filters: [{ name: "音频", extensions: ["mp3", "wav", "flac", "aac", "ogg", "m4a", "m4b", "opus", "aiff", "mp4", "mkv", "avi"] }],
  });
  if (sel) {
    inputPath.value = sel as string;
    done.value = false;
    error.value = "";
  }
}

async function pickOutput() {
  if (!hasTauri || !inputPath.value) return;
  const base = inputName.value.split(".").slice(0, -1).join(".") || "audio";
  const sel = await save({
    defaultPath: `${base}.${format.value}`,
    filters: [{ name: "音频", extensions: [format.value] }],
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
    busy.value = true;
    const result = await runFfmpeg(audioArgs());
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
.audio-done {
  color: #0f7b0f;
  font-size: 13px;
  margin: 4px 0 0;
  word-break: break-all;
}
</style>
