<template>
  <div class="tb-section pomodoro-tool">
    <div class="tb-two-col">
      <!-- 番茄钟 -->
      <div class="tb-card pomo-card">
        <p class="tb-title">番茄钟</p>

        <div class="pomo-phases" role="radiogroup" aria-label="阶段">
          <button
            v-for="p in phases"
            :key="p.value"
            type="button"
            class="nb-segmented-item"
            :class="{ 'is-active': phase === p.value }"
            @click="switchPhase(p.value)">
            {{ p.label }}
          </button>
        </div>

        <div class="pomo-display">
          <div class="pomo-time">{{ displayTime }}</div>
          <div class="pomo-progress">
            <div class="pomo-progress-fill" :style="{ width: progressPct + '%' }"></div>
          </div>
          <div class="pomo-caption">{{ phaseCaption }}</div>
        </div>

        <div class="tb-row pomo-actions">
          <button type="button" class="tb-btn tb-btn-primary" @click="toggleRunning">{{ running ? "暂停" : "开始" }}</button>
          <button type="button" class="tb-btn" @click="reset">重置</button>
          <button type="button" class="tb-btn" @click="skip">跳过</button>
        </div>

        <div class="pomo-stats">
          <span class="pomo-tomatoes">
            {{ "🍅".repeat(Math.min(completed, 8)) }}<template v-if="completed > 8">×{{ completed }}</template>
          </span>
          <span class="tb-hint">本轮已专注 {{ completed }} 个番茄</span>
        </div>
      </div>

      <!-- 白噪音 -->
      <div class="tb-card">
        <p class="tb-title">白噪音</p>
        <div class="tb-row">
          <span class="tb-row-label">类型</span>
          <select v-model="noiseType" class="nb-select" :disabled="noisePlaying">
            <option value="white">白噪音</option>
            <option value="pink">粉红噪音</option>
            <option value="brown">布朗噪音</option>
          </select>
          <button type="button" class="tb-btn" :class="{ 'tb-btn-primary': !noisePlaying }" @click="toggleNoise">
            {{ noisePlaying ? "停止" : "播放" }}
          </button>
        </div>
        <div class="tb-row">
          <span class="tb-row-label">音量</span>
          <input v-model.number="volume" type="range" min="0" max="100" class="nb-range" :disabled="!noisePlaying" @input="applyVolume" />
          <span class="tb-hint">{{ volume }}%</span>
        </div>
        <p class="tb-hint">白噪音由 Web Audio 实时合成，无需音频文件，离线可用。适合专注、助眠。</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

// ---- 番茄钟 ----
type Phase = "work" | "short" | "long";
const DURATIONS: Record<Phase, number> = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };

const phases: { value: Phase; label: string }[] = [
  { value: "work", label: "专注" },
  { value: "short", label: "短休" },
  { value: "long", label: "长休" },
];

const phase = ref<Phase>("work");
const remaining = ref(DURATIONS.work);
const running = ref(false);
const completed = ref(0);

const phaseCaption = computed(() => {
  const t: Record<Phase, string> = {
    work: "保持专注，投入手头任务",
    short: "休息一下，起来活动活动",
    long: "长时间休息，好好放松",
  };
  return t[phase.value];
});

const displayTime = computed(() => {
  const m = Math.floor(remaining.value / 60);
  const s = remaining.value % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
});

const progressPct = computed(() => {
  const total = DURATIONS[phase.value];
  return Math.round(((total - remaining.value) / total) * 100);
});

function switchPhase(p: Phase) {
  phase.value = p;
  remaining.value = DURATIONS[p];
  stopTimer();
  running.value = false;
}

function toggleRunning() {
  running.value = !running.value;
  if (running.value) startTimer();
  else stopTimer();
}

function reset() {
  stopTimer();
  running.value = false;
  phase.value = "work";
  remaining.value = DURATIONS.work;
}

function skip() {
  advance();
}

function advance() {
  if (phase.value === "work") {
    completed.value++;
    phase.value = completed.value % 4 === 0 ? "long" : "short";
  } else {
    phase.value = "work";
  }
  remaining.value = DURATIONS[phase.value];
  if (running.value) beep();
}

let timer: ReturnType<typeof setInterval> | null = null;

function startTimer() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    remaining.value--;
    if (remaining.value <= 0) {
      beep();
      advance();
      remaining.value = DURATIONS[phase.value];
    }
  }, 1000);
}

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

// 阶段完成提示音
function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => void ctx.close();
  } catch {
    /* 忽略 */
  }
}

// ---- 白噪音 ----
type NoiseType = "white" | "pink" | "brown";
const noiseType = ref<NoiseType>("white");
const noisePlaying = ref(false);
const volume = ref(60);

let audioCtx: AudioContext | null = null;
let noiseSource: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;

function buildNoiseBuffer(ctx: AudioContext, type: NoiseType): AudioBuffer {
  const seconds = 3;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  let lastOut = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (type === "white") {
      data[i] = white;
    } else if (type === "pink") {
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    } else {
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }
  }
  return buffer;
}

function toggleNoise() {
  if (noisePlaying.value) {
    noiseSource?.stop();
    noiseSource = null;
    noisePlaying.value = false;
    return;
  }
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    void audioCtx.resume();
    const buffer = buildNoiseBuffer(audioCtx, noiseType.value);
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    gainNode = audioCtx.createGain();
    gainNode.gain.value = volume.value / 100;
    src.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    src.start();
    noiseSource = src;
    noisePlaying.value = true;
  } catch {
    /* 忽略 */
  }
}

function applyVolume() {
  if (gainNode) gainNode.gain.value = volume.value / 100;
}
</script>

<style scoped>
.pomo-card {
  gap: 16px;
}

.pomo-phases {
  display: inline-flex;
  align-self: flex-start;
  padding: 2px;
  border-radius: 6px;
  background: var(--ctrl-fill-secondary, rgba(249, 249, 249, 0.5));
  border: 1px solid var(--ctrl-border, rgba(0, 0, 0, 0.06));
}

.pomo-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 12px 0 4px;
}

.pomo-time {
  font-family: "Cascadia Mono", "Consolas", monospace;
  font-size: 56px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 2px;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
}

.pomo-progress {
  width: 100%;
  max-width: 320px;
  height: 6px;
  border-radius: 3px;
  background: var(--ctrl-fill-tertiary, rgba(0, 0, 0, 0.12));
  overflow: hidden;
}

.pomo-progress-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--accent-base, #0067c0);
  transition: width 1s linear;
}

.pomo-caption {
  font-size: 13px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}

.pomo-actions {
  justify-content: center;
}

.pomo-stats {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pomo-tomatoes {
  font-size: 16px;
  letter-spacing: 2px;
}

.nb-range {
  width: 180px;
  accent-color: var(--accent-base, #0067c0);
}
</style>
