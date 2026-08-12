<template>
  <div class="tb-section media-tool">
    <FfmpegGate v-if="ffmpegReady === false" />
    <template v-else>
      <div class="tb-card">
        <div class="tb-row">
          <p class="tb-title tb-grow">音视频转换 / 音频提取 / 裁剪</p>
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
          <select v-model="container" class="nb-select" :disabled="extractAudio">
            <option v-for="f in containers" :key="f.value" :value="f.value">{{ f.label }}</option>
          </select>
          <label class="nb-check">
            <input v-model="extractAudio" type="checkbox" />
            仅提取音频（MP3）
          </label>
        </div>
        <div class="tb-row">
          <span class="tb-row-label">裁剪开始</span>
          <WinTextBox v-model:Text="trimStart" PlaceholderText="例如 00:01:30 或 90" class="tb-grow" Height="36" />
          <span class="tb-row-label">时长</span>
          <WinTextBox v-model:Text="trimDuration" PlaceholderText="例如 00:00:30（留空=到结尾）" class="tb-grow" Height="36" />
        </div>
        <p class="tb-hint">裁剪时间格式：秒数或 HH:MM:SS。示例：跳过前 1 分 30 秒、截取 30 秒。</p>
      </div>

      <div class="tb-card">
        <div class="tb-row">
          <button type="button" class="tb-btn tb-btn-primary" :disabled="busy || !canRun" @click="convert">
            {{ busy ? "转换中…（请勿关闭）" : "开始转换" }}
          </button>
          <span v-if="busy" class="tb-hint">正在调用本地 FFmpeg 处理…</span>
        </div>
        <p v-if="error" class="tb-error">{{ error }}</p>
        <p v-if="done" class="media-done">✓ 转换完成：{{ outputPath }}</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import WinTextBox from "@/winui/components/WinTextBox.vue";
import FfmpegGate from "@/components/FfmpegGate.vue";
import { open, save } from "@tauri-apps/plugin-dialog";
import { resolveFfmpeg, runFfmpeg, FFMPEG_MISSING } from "@/utils/ffmpeg";

const hasTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const ffmpegReady = ref<boolean | null>(null);
const inputPath = ref("");
const outputPath = ref("");
const container = ref("mp4");
const extractAudio = ref(false);
const trimStart = ref("");
const trimDuration = ref("");
const busy = ref(false);
const error = ref("");
const done = ref(false);

const containers = [
  { value: "mp4", label: "MP4（H.264 + AAC）" },
  { value: "mkv", label: "MKV（H.264 + AAC）" },
  { value: "avi", label: "AVI（MPEG-4 + MP3）" },
  { value: "webm", label: "WebM（VP8 + Vorbis）" },
  { value: "mov", label: "MOV（H.264 + AAC）" },
];

const CODECS: Record<string, string[]> = {
  mp4: ["-c:v", "libx264", "-preset", "fast", "-c:a", "aac"],
  mkv: ["-c:v", "libx264", "-preset", "fast", "-c:a", "aac"],
  avi: ["-c:v", "mpeg4", "-q:v", "4", "-c:a", "mp3"],
  webm: ["-c:v", "libvpx", "-b:v", "1M", "-c:a", "libvorbis"],
  mov: ["-c:v", "libx264", "-preset", "fast", "-c:a", "aac"],
};

const inputName = computed(() => inputPath.value.split(/[\\/]/).pop() ?? inputPath.value);
const canRun = computed(() => !!inputPath.value && !!outputPath.value);

async function pickInput() {
  if (!hasTauri) return;
  const sel = await open({
    multiple: false,
    filters: [{ name: "音视频", extensions: ["mp4", "mkv", "avi", "webm", "mov", "flv", "wmv", "ts", "mp3", "wav", "flac", "aac", "ogg", "m4a"] }],
  });
  if (sel) {
    inputPath.value = sel as string;
    done.value = false;
    error.value = "";
  }
}

async function pickOutput() {
  if (!hasTauri || !inputPath.value) return;
  const base = (inputName.value.split(".").slice(0, -1).join(".") || "media");
  const ext = extractAudio.value ? "mp3" : container.value;
  const sel = await save({
    defaultPath: `${base}.${ext}`,
    filters: [{ name: "输出文件", extensions: [ext] }],
  });
  if (sel) {
    outputPath.value = sel as string;
    done.value = false;
  }
}

function toFfTimestamp(s: string): string {
  const t = s.trim();
  if (!t) return "";
  if (/^\d+$/.test(t)) return t; // 纯秒数
  return t;
}

async function convert() {
  error.value = "";
  done.value = false;
  try {
    const args = ["-y"];
    const start = toFfTimestamp(trimStart.value);
    if (start) args.push("-ss", start);
    args.push("-i", inputPath.value);
    const dur = toFfTimestamp(trimDuration.value);
    if (dur) args.push("-t", dur);

    if (extractAudio.value) {
      args.push("-vn", "-c:a", "libmp3lame", "-q:a", "2");
    } else {
      args.push(...(CODECS[container.value] ?? CODECS.mp4));
    }
    args.push(outputPath.value);

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
.media-done {
  color: #0f7b0f;
  font-size: 13px;
  margin: 4px 0 0;
  word-break: break-all;
}
</style>
