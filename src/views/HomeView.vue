<template>
  <div class="home-view">
    <div class="home-scroll">
      <!-- Hero -->
      <header class="home-hero">
        <img :src="appIcon" alt="" class="home-hero-icon" />
        <div class="home-hero-text">
          <h1 class="home-hero-title">WinUI 工具箱</h1>
          <p class="home-hero-sub">原生体验 · 本地优先 · 离线可用</p>
        </div>
        <div class="home-hero-stats">
          <span class="home-stat"><b>{{ readyCount }}</b> 个可用工具</span>
          <span class="home-stat"><b>{{ allTools.length }}</b> 个规划工具</span>
          <span class="home-stat"><b>100%</b> 本地处理</span>
        </div>
      </header>

      <!-- 搜索 -->
      <div class="home-search-wrap">
        <span class="home-search-icon" aria-hidden="true">&#xE721;</span>
        <WinTextBox
          v-model:Text="query"
          PlaceholderText="搜索工具（回车跳转第一个结果）…"
          class="home-search-input"
          Height="40" />
      </div>
      <div v-if="query.trim()" class="home-search-results">
        <button
          v-for="r in searchResults"
          :key="r.id"
          type="button"
          class="home-search-result"
          @click="go(r.id)">
          <span class="home-search-result-icon" aria-hidden="true">{{ r.icon }}</span>
          <span class="home-search-result-title">{{ r.title }}</span>
          <span v-if="r.status === 'planned'" class="home-search-result-badge">规划中</span>
          <span class="home-search-result-module">{{ moduleTitle(r.id) }}</span>
        </button>
        <p v-if="!searchResults.length" class="tb-hint home-search-empty">未找到匹配的工具。</p>
      </div>

      <!-- 最近使用 -->
      <section v-if="recentReady.length" class="home-section">
        <h2 class="home-section-title">最近使用</h2>
        <div class="home-tool-row">
          <button v-for="id in recentReady" :key="id" type="button" class="home-tool-chip" @click="go(id)">
            <span class="home-tool-chip-icon" aria-hidden="true">{{ iconOf(id) }}</span>
            <span>{{ titleOf(id) }}</span>
          </button>
        </div>
      </section>

      <!-- 收藏 -->
      <section v-if="favoritesReady.length" class="home-section">
        <h2 class="home-section-title">我的收藏</h2>
        <div class="home-tool-row">
          <button v-for="id in favoritesReady" :key="id" type="button" class="home-tool-chip" @click="go(id)">
            <span class="home-tool-chip-icon" aria-hidden="true">{{ iconOf(id) }}</span>
            <span>{{ titleOf(id) }}</span>
          </button>
        </div>
      </section>

      <!-- 模块分类 -->
      <section class="home-section">
        <h2 class="home-section-title">工具分类</h2>
        <div class="home-module-grid">
          <button
            v-for="m in toolModules"
            :key="m.id"
            type="button"
            class="home-module-card"
            @click="goModule(m)">
            <span class="home-module-icon" aria-hidden="true">{{ m.icon }}</span>
            <span class="home-module-name">{{ m.title }}</span>
            <span class="home-module-count">{{ readyInModule(m.id).length }} 个可用 · {{ m.tools.length }} 个工具</span>
            <span class="home-module-arrow" aria-hidden="true">&#xE76C;</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { allTools, toolModules, findToolById, type ToolModuleDef } from "@/tools/registry";
import { useHistoryStore } from "@/stores/history";
import WinTextBox from "@/winui/components/WinTextBox.vue";
import appIcon from "@/winui/assets/AppIcon-512.png";

const router = useRouter();
const history = useHistoryStore();

const query = ref("");

const readyCount = computed(() => allTools.filter((t) => t.status === "ready").length);

const searchResults = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return [];
  return allTools
    .filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.id.includes(q))
    .slice(0, 12);
});

const recentReady = computed(() => history.recent.filter((id) => !!findToolById(id)));
const favoritesReady = computed(() => history.favorites.filter((id) => !!findToolById(id)));

function go(id: string) {
  void router.push(`/${id}`);
}

function goModule(m: ToolModuleDef) {
  const first = m.tools.find((t) => t.status === "ready") ?? m.tools[0];
  if (first) void router.push(`/${first.id}`);
}

function titleOf(id: string): string {
  return findToolById(id)?.title ?? id;
}

function iconOf(id: string): string {
  return findToolById(id)?.icon ?? "";
}

function moduleTitle(id: string): string {
  return toolModules.find((m) => m.tools.some((t) => t.id === id))?.title ?? "";
}

function readyInModule(moduleId: string): typeof allTools {
  return toolModules.find((m) => m.id === moduleId)?.tools.filter((t) => t.status === "ready") ?? [];
}

onMounted(() => {
  void history.init();
});
</script>

<style scoped>
.home-view {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.home-scroll {
  height: 100%;
  overflow-y: auto;
  padding: 24px 28px 40px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Hero */
.home-hero {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 28px 32px;
  border-radius: 12px;
  background: var(--card-bg, rgba(255, 255, 255, 0.7));
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}

.home-hero-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.home-hero-text {
  flex: 1 1 auto;
  min-width: 0;
}

.home-hero-title {
  margin: 0 0 4px;
  font-size: 24px;
  font-weight: 650;
  letter-spacing: 0.2px;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
}

.home-hero-sub {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}

.home-hero-stats {
  display: flex;
  gap: 10px;
}

.home-stat {
  font-size: 12px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
  background: var(--ctrl-fill-secondary, rgba(249, 249, 249, 0.5));
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  border-radius: 14px;
  padding: 4px 12px;
  white-space: nowrap;
}

.home-stat b {
  font-weight: 650;
  color: var(--accent-base, #0067c0);
}

/* 搜索 */
.home-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.home-search-icon {
  position: absolute;
  left: 14px;
  z-index: 1;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
  pointer-events: none;
}

.home-search-input {
  width: 100%;
  max-width: 520px;
}

.home-search-input :deep(input) {
  padding-left: 40px;
}

.home-search-results {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: -14px;
}

.home-search-result {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 520px;
  padding: 8px 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--card-bg, rgba(255, 255, 255, 0.7));
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
  font-family: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background 120ms ease;
}

.home-search-result:hover {
  background: var(--subtle-secondary, rgba(0, 0, 0, 0.04));
}

.home-search-result-icon {
  flex: none;
  width: 28px;
  text-align: center;
  color: var(--accent-base, #0067c0);
  font-size: 15px;
}

.home-search-result-title {
  font-weight: 500;
}

.home-search-result-badge {
  flex: none;
  font-size: 11px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  border-radius: 10px;
  padding: 1px 8px;
}

.home-search-result-module {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-tertiary, rgba(0, 0, 0, 0.4458));
}

.home-search-empty {
  padding: 8px 4px;
}

/* 区块 */
.home-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.home-section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
}

.home-tool-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.home-tool-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  border-radius: 8px;
  background: var(--card-bg, rgba(255, 255, 255, 0.7));
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background 120ms ease;
}

.home-tool-chip:hover {
  background: var(--subtle-secondary, rgba(0, 0, 0, 0.06));
}

.home-tool-chip-icon {
  color: var(--accent-base, #0067c0);
}

/* 模块卡片 */
.home-module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.home-module-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 18px;
  border-radius: 10px;
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  background: var(--card-bg, rgba(255, 255, 255, 0.7));
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease, border-color 120ms ease;
}

.home-module-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent-border-accent, rgba(0, 0, 0, 0.4));
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.home-module-card:active {
  transform: translateY(0);
}

.home-module-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-base, #0067c0) 14%, transparent);
  color: var(--accent-base, #0067c0);
  font-size: 22px;
  margin-bottom: 4px;
}

.home-module-name {
  font-size: 15px;
  font-weight: 600;
}

.home-module-count {
  font-size: 12px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}

.home-module-arrow {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary, rgba(0, 0, 0, 0.4458));
  font-size: 14px;
}

@media (max-width: 720px) {
  .home-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .home-hero-stats {
    flex-wrap: wrap;
  }
}
</style>
