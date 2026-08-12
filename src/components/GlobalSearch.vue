<template>
  <Teleport to="body">
    <Transition name="gs">
      <div v-if="open" class="gs-backdrop" @mousedown.self="emit('close')">
        <div class="gs-panel" role="dialog" aria-modal="true" aria-label="全局搜索">
          <div class="gs-input-wrap">
            <span class="gs-icon" aria-hidden="true">&#xE721;</span>
            <input
              ref="inputRef"
              v-model="query"
              class="gs-input"
              placeholder="搜索工具…"
              spellcheck="false"
              autocomplete="off"
              @keydown.enter="goFirst"
              @keydown.up.prevent="move(-1)"
              @keydown.down.prevent="move(1)"
              @keydown.esc="emit('close')" />
            <kbd class="gs-kbd">Esc</kbd>
          </div>

          <div class="gs-results">
            <button
              v-for="(r, i) in results"
              :key="r.id"
              type="button"
              class="gs-result"
              :class="{ 'is-active': i === activeIndex }"
              @mouseenter="activeIndex = i"
              @click="go(r.id)">
              <span class="gs-result-icon" aria-hidden="true">{{ r.icon }}</span>
              <span class="gs-result-title">{{ r.title }}</span>
              <span v-if="r.status === 'planned'" class="gs-result-badge">规划中</span>
              <span class="gs-result-module">{{ moduleTitle(r.id) }}</span>
            </button>
            <p v-if="!query" class="gs-empty">输入关键词开始搜索…</p>
            <p v-else-if="!results.length" class="gs-empty">未找到匹配的工具。</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { toolModules } from "@/tools/registry";
import { searchTools } from "@/utils/tool-search";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: "close"): void }>();

const router = useRouter();
const inputRef = ref<HTMLInputElement | null>(null);
const query = ref("");
const activeIndex = ref(0);

const results = computed(() => searchTools(query.value, 12));

function moduleTitle(id: string): string {
  return toolModules.find((m) => m.tools.some((t) => t.id === id))?.title ?? "";
}

function go(id: string) {
  emit("close");
  void router.push(`/${id}`);
}

function goFirst() {
  if (results.value.length) go(results.value[0].id);
}

function move(delta: number) {
  if (!results.value.length) return;
  activeIndex.value = (activeIndex.value + delta + results.value.length) % results.value.length;
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      query.value = "";
      activeIndex.value = 0;
      void nextTick(() => inputRef.value?.focus());
    }
  }
);
</script>

<style scoped>
.gs-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: var(--dialog-overlay, rgba(0, 0, 0, 0.3));
  display: flex;
  justify-content: center;
  padding-top: 14vh;
}

.gs-panel {
  width: min(560px, 90vw);
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  background: var(--flyout-bg, rgba(252, 252, 252, 0.92));
  border: 1px solid var(--flyout-border, rgba(0, 0, 0, 0.06));
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(30px) saturate(160%);
}

.gs-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.08));
}

.gs-icon {
  position: absolute;
  left: 18px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
  pointer-events: none;
  font-size: 16px;
}

.gs-input {
  flex: 1;
  min-width: 0;
  padding: 6px 0 6px 28px;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 16px;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
}

.gs-input::placeholder {
  color: var(--text-tertiary, rgba(0, 0, 0, 0.4458));
}

.gs-kbd {
  flex: none;
  padding: 2px 8px;
  border-radius: 5px;
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.12));
  background: var(--ctrl-fill-secondary, rgba(249, 249, 249, 0.5));
  font-family: inherit;
  font-size: 11px;
  color: var(--text-tertiary, rgba(0, 0, 0, 0.4458));
}

.gs-results {
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.gs-result {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
  font-family: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.gs-result.is-active {
  background: var(--subtle-secondary, rgba(0, 0, 0, 0.06));
}

.gs-result-icon {
  flex: none;
  width: 28px;
  text-align: center;
  color: var(--accent-base, #0067c0);
  font-size: 15px;
  font-family: "WinUIOnWebIcons", "Segoe Fluent Icons", "Segoe MDL2 Assets", sans-serif;
}

.gs-result-title {
  font-weight: 500;
}

.gs-result-badge {
  flex: none;
  font-size: 11px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  border-radius: 10px;
  padding: 1px 8px;
}

.gs-result-module {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-tertiary, rgba(0, 0, 0, 0.4458));
}

.gs-empty {
  margin: 0;
  padding: 18px;
  text-align: center;
  font-size: 13px;
  color: var(--text-tertiary, rgba(0, 0, 0, 0.4458));
}

.gs-enter-active,
.gs-leave-active {
  transition: opacity 140ms ease;
}

.gs-enter-from,
.gs-leave-to {
  opacity: 0;
}
</style>
