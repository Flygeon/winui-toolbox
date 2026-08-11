<template>
  <div class="tb-section uuid-tool">
    <div class="tb-two-col">
      <div class="tb-card">
        <p class="tb-title">UUID（v4）</p>
        <div class="tb-row">
          <span class="tb-row-label">数量</span>
          <input v-model.number="uuidCount" type="number" min="1" max="500" class="nb-input nb-input-num" />
          <button type="button" class="tb-btn tb-btn-primary" @click="generateUuids">生成</button>
          <CopyButton :text="uuidOutput" />
        </div>
        <WinTextBox
          v-model:Text="uuidOutput"
          AcceptsReturn
          TextWrapping="Wrap"
          IsReadOnly
          Height="240"
          PlaceholderText="生成的 UUID 将显示在这里…" />
        <p class="tb-hint">基于 Web Crypto 的加密随机源（crypto.randomUUID）。</p>
      </div>

      <div class="tb-card">
        <p class="tb-title">随机密码</p>
        <div class="tb-row">
          <span class="tb-row-label">长度</span>
          <input v-model.number="pwdLength" type="range" min="6" max="64" class="nb-range" />
          <span class="tb-hint">{{ pwdLength }}</span>
        </div>
        <div class="pwd-options">
          <label class="nb-check"><input v-model="pwdOpts.upper" type="checkbox" />大写 A-Z</label>
          <label class="nb-check"><input v-model="pwdOpts.lower" type="checkbox" />小写 a-z</label>
          <label class="nb-check"><input v-model="pwdOpts.digits" type="checkbox" />数字 0-9</label>
          <label class="nb-check"><input v-model="pwdOpts.symbols" type="checkbox" />符号 !@#$%</label>
          <label class="nb-check"><input v-model="pwdOpts.ambiguous" type="checkbox" />排除易混淆字符</label>
        </div>
        <div class="tb-row">
          <button type="button" class="tb-btn tb-btn-primary" @click="generatePassword">生成</button>
          <CopyButton :text="passwordOutput" />
        </div>
        <div class="tb-output password-output">{{ passwordOutput || "生成的密码将显示在这里…" }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import WinTextBox from "@/winui/components/WinTextBox.vue";
import CopyButton from "@/components/CopyButton.vue";

const uuidCount = ref(10);
const uuidOutput = ref("");

const pwdLength = ref(16);
const pwdOpts = reactive({
  upper: true,
  lower: true,
  digits: true,
  symbols: true,
  ambiguous: false,
});
const passwordOutput = ref("");

function generateUuids() {
  const n = Math.min(Math.max(uuidCount.value || 1, 1), 500);
  uuidOutput.value = Array.from({ length: n }, () => crypto.randomUUID()).join("\n");
}

const AMBIGUOUS = "Il1O0";

function randomInt(maxExclusive: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] % maxExclusive;
}

function generatePassword() {
  const pools: { chars: string; enabled: boolean }[] = [
    { chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", enabled: pwdOpts.upper },
    { chars: "abcdefghijklmnopqrstuvwxyz", enabled: pwdOpts.lower },
    { chars: "0123456789", enabled: pwdOpts.digits },
    { chars: "!@#$%^&*()-_=+[]{};:,.<>?", enabled: pwdOpts.symbols },
  ];
  const enabled = pools.filter((p) => p.enabled);
  if (!enabled.length) {
    passwordOutput.value = "请至少选择一种字符类型。";
    return;
  }
  const chars = enabled
    .flatMap((p) => p.chars.split(""))
    .filter((c) => !pwdOpts.ambiguous || !AMBIGUOUS.includes(c));
  if (!chars.length) {
    passwordOutput.value = "字符集为空。";
    return;
  }
  const len = Math.min(Math.max(pwdLength.value || 8, 6), 64);
  // 保证每种选中的字符类型至少出现一次，其余随机填充
  const chosen = enabled.map((p) => {
    const set = p.chars.split("").filter((c) => !pwdOpts.ambiguous || !AMBIGUOUS.includes(c));
    return set[randomInt(set.length)];
  });
  while (chosen.length < len) chosen.push(chars[randomInt(chars.length)]);
  // Fisher-Yates 洗牌
  for (let i = chosen.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
  }
  passwordOutput.value = chosen.join("");
}
</script>

<style scoped>
.nb-input-num {
  width: 72px;
}

.nb-range {
  width: 180px;
  accent-color: var(--accent-base, #0067c0);
}

.pwd-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
}

.password-output {
  font-family: "Cascadia Mono", "Consolas", monospace;
  word-break: break-all;
  min-height: 52px;
}
</style>
