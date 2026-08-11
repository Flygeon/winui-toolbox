<template>
  <div class="tb-section cron-tool">
    <div class="tb-card">
      <p class="tb-title">Cron 表达式（5 段：分 时 日 月 星期）</p>
      <div class="tb-row">
        <WinTextBox v-model:Text="expression" PlaceholderText="例如 */5 * * * *" class="tb-grow" Height="38" />
        <button type="button" class="tb-btn tb-btn-primary" @click="parse">解析</button>
        <CopyButton :text="textResult" />
      </div>
      <div class="tb-row">
        <span class="tb-hint">常用：</span>
        <button v-for="p in presets" :key="p.expr" type="button" class="tb-chip" @click="applyPreset(p.expr)">{{ p.label }}</button>
      </div>
      <p v-if="error" class="tb-error">{{ error }}</p>
    </div>

    <template v-if="explained.length">
      <div class="tb-card">
        <p class="tb-title">字段含义</p>
        <div class="field-list">
          <div v-for="f in explained" :key="f.name" class="field-row">
            <span class="field-name">{{ f.name }}</span>
            <code class="field-raw">{{ f.raw }}</code>
            <span class="field-desc">{{ f.desc }}</span>
          </div>
        </div>
      </div>

      <div class="tb-card">
        <p class="tb-title">未来执行时间</p>
        <div class="next-list">
          <div v-for="(d, i) in nextDates" :key="i" class="next-item">
            <span class="next-index">{{ i + 1 }}</span>
            <code class="next-value">{{ d }}</code>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import cronParser from "cron-parser";
import WinTextBox from "@/winui/components/WinTextBox.vue";
import CopyButton from "@/components/CopyButton.vue";

const expression = ref("*/5 * * * *");
const error = ref("");
const explained = ref<{ name: string; raw: string; desc: string }[]>([]);
const nextDates = ref<string[]>([]);
const textResult = ref("");

const presets = [
  { label: "每分钟", expr: "* * * * *" },
  { label: "每 5 分钟", expr: "*/5 * * * *" },
  { label: "每小时", expr: "0 * * * *" },
  { label: "每天 9:00", expr: "0 9 * * *" },
  { label: "每周一 9:00", expr: "0 9 * * 1" },
  { label: "每月 1 号 0 点", expr: "0 0 1 * *" },
];

function applyPreset(expr: string) {
  expression.value = expr;
  parse();
}

/** 单个字段的人性化解释 */
function fieldDesc(part: string, kind: "min" | "hour" | "dom" | "month" | "dow"): string {
  if (part === "*" || part === "?") {
    return kind === "min" ? "每分钟" : kind === "hour" ? "每小时" : kind === "dom" ? "每天" : kind === "month" ? "每月" : "每星期中的每一天";
  }
  if (/^\*\//.test(part)) {
    const n = part.slice(2);
    const map = { min: `每 ${n} 分钟`, hour: `每 ${n} 小时`, dom: `每 ${n} 天`, month: `每 ${n} 个月`, dow: `每 ${n} 星期` } as const;
    return map[kind];
  }
  const range = (s: string) => {
    const [a, b] = s.split("-");
    const name = (v: string, k: string) => {
      if (k === "month") return `${v} 月`;
      if (k === "dow") return `星期${["日", "一", "二", "三", "四", "五", "六"][Number(v) % 7]}`;
      if (k === "min") return `${v} 分`;
      if (k === "hour") return `${v} 时`;
      return `${v} 日`;
    };
    return b ? `${name(a, kind)}到${name(b, kind)}之间` : name(a, kind);
  };
  if (part.includes(",")) return part.split(",").map((p) => range(p)).join("、");
  if (part.includes("-")) return range(part);
  if (part === "L") return kind === "dom" ? "每月最后一天" : "星期六";
  if (kind === "dow" && /^[0-7]$/.test(part)) return range(part);
  return range(part);
}

function parse() {
  error.value = "";
  explained.value = [];
  nextDates.value = [];
  const expr = expression.value.trim();
  if (!expr) {
    error.value = "请输入 Cron 表达式。";
    return;
  }
  const parts = expr.split(/\s+/);
  if (parts.length !== 5) {
    error.value = `表达式应为 5 段（分 时 日 月 星期），当前为 ${parts.length} 段。`;
    return;
  }
  try {
    cronParser.parseExpression(expr, { currentDate: new Date() });
  } catch (e) {
    error.value = `表达式无效：${(e as Error).message}`;
    return;
  }

  const kinds = ["min", "hour", "dom", "month", "dow"] as const;
  const names = ["分钟", "小时", "日期", "月份", "星期"];
  explained.value = parts.map((p, i) => ({
    name: names[i],
    raw: p,
    desc: fieldDesc(p, kinds[i]),
  }));

  const interval = cronParser.parseExpression(expr, { currentDate: new Date() });
  const list: string[] = [];
  for (let i = 0; i < 6 && interval.hasNext(); i++) {
    const d = interval.next().toDate();
    const pad = (n: number) => String(n).padStart(2, "0");
    list.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`);
  }
  nextDates.value = list;
  textResult.value = `${expr}\n\n${explained.value.map((f) => `${f.name}：${f.desc}`).join("\n")}\n\n未来执行：\n${list.join("\n")}`;
}
</script>

<style scoped>
.field-list,
.next-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  font-size: 13px;
}

.field-name {
  flex: none;
  width: 40px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}

.field-raw {
  flex: none;
  min-width: 90px;
  font-family: "Cascadia Mono", "Consolas", monospace;
  color: var(--accent-base, #0067c0);
}

.field-desc {
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
}

.next-item {
  display: flex;
  align-items: baseline;
  gap: 12px;
  font-size: 13px;
}

.next-index {
  flex: none;
  width: 20px;
  text-align: right;
  color: var(--text-tertiary, rgba(0, 0, 0, 0.4458));
}

.next-value {
  font-family: "Cascadia Mono", "Consolas", monospace;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
}
</style>
