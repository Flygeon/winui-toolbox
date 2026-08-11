<template>
  <div class="tb-section mask-tool">
    <div class="tb-card">
      <div class="tb-row">
        <p class="tb-title tb-grow">待处理文本</p>
        <button type="button" class="tb-btn" @click="loadSample">示例</button>
        <button type="button" class="tb-btn" @click="input = ''">清空</button>
      </div>
      <WinTextBox
        v-model:Text="input"
        PlaceholderText="粘贴包含手机号、身份证、银行卡、邮箱等敏感信息的文本…"
        AcceptsReturn
        TextWrapping="Wrap"
        Height="200" />
    </div>

    <div class="tb-card">
      <p class="tb-title">脱敏规则</p>
      <div class="mask-options">
        <label v-for="opt in maskOptions" :key="opt.key" class="nb-check">
          <input v-model="enabled" type="checkbox" :value="opt.key" />
          {{ opt.label }}
        </label>
      </div>
      <div class="tb-row">
        <button type="button" class="tb-btn tb-btn-primary" @click="apply">一键脱敏</button>
        <CopyButton :text="output" />
        <p v-if="count" class="tb-hint">共替换 {{ count }} 处敏感信息</p>
      </div>
      <WinTextBox
        v-model:Text="output"
        AcceptsReturn
        TextWrapping="Wrap"
        IsReadOnly
        Height="200"
        PlaceholderText="脱敏结果…" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import WinTextBox from "@/winui/components/WinTextBox.vue";
import CopyButton from "@/components/CopyButton.vue";

const input = ref("");
const output = ref("");
const count = ref(0);

type MaskKey = "phone" | "idcard" | "bankcard" | "email" | "name";

const maskOptions: { key: MaskKey; label: string; hint: string }[] = [
  { key: "phone", label: "手机号", hint: "138****1234" },
  { key: "idcard", label: "身份证", hint: "110101********1234" },
  { key: "bankcard", label: "银行卡", hint: "6222********1234" },
  { key: "email", label: "邮箱", hint: "a***@example.com" },
  { key: "name", label: "姓名", hint: "张*" },
];

const enabled = ref<MaskKey[]>(["phone", "idcard", "bankcard", "email", "name"]);

function apply() {
  let text = input.value;
  let replaced = 0;

  const run = (re: RegExp, mask: (m: string) => string) => {
    text = text.replace(re, (m) => {
      replaced++;
      return mask(m);
    });
  };

  if (enabled.value.includes("name")) {
    run(/[一-龥]{2,6}/g, (m) => m[0] + "*".repeat(Math.max(m.length - 1, 1)));
  }
  if (enabled.value.includes("email")) {
    run(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, (m) => {
      const at = m.lastIndexOf("@");
      const local = m.slice(0, at);
      return (local[0] ?? "") + "***@" + m.slice(at + 1);
    });
  }
  if (enabled.value.includes("idcard")) {
    run(/\d{6}\d{8}\d{3}[\dXx]/g, (m) => m.slice(0, 6) + "********" + m.slice(-4));
  }
  if (enabled.value.includes("phone")) {
    run(/(?<!\d)1[3-9]\d{9}(?!\d)/g, (m) => m.slice(0, 3) + "****" + m.slice(7));
  }
  if (enabled.value.includes("bankcard")) {
    run(/(?<!\d)\d{12,19}(?!\d)/g, (m) => m.slice(0, 4) + "********" + m.slice(-4));
  }

  count.value = replaced;
  output.value = text;
}

function loadSample() {
  input.value = [
    "客户李小明（13812345678）于 2024-08-11 下单，",
    "身份证号 110101199003074512，",
    "银行卡 6222020202020202020，",
    "联系邮箱 zhangsan@example.com。",
  ].join("\n");
}
</script>

<style scoped>
.mask-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
}
</style>
