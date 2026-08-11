<template>
  <div class="tool-view">
    <template v-if="tool">
      <header class="tool-view-header">
        <div class="tool-view-title-row">
          <h1 class="tool-view-title">{{ tool.title }}</h1>
          <span v-if="tool.status === 'planned'" class="tool-view-badge">规划中</span>
        </div>
        <p class="tool-view-desc">{{ tool.description }}</p>
      </header>

      <div class="tool-view-body">
        <KeepAlive>
          <component
            :is="activeComponent"
            v-if="activeComponent"
            :key="tool.id"
            :tool="tool.status === 'planned' ? tool : undefined" />
        </KeepAlive>
      </div>
    </template>

    <div v-else class="tool-view-missing">
      <p class="tool-view-missing-text">未找到该工具。</p>
      <RouterLink to="/" class="tool-view-missing-link">返回首页</RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw } from "vue";
import { useRoute } from "vue-router";
import { findToolById } from "@/tools/registry";
import PlaceholderTool from "@/components/PlaceholderTool.vue";

const route = useRoute();

const tool = computed(() => findToolById(String(route.params.id ?? "")));

const activeComponent = computed(() => {
  if (!tool.value) return null;
  if (tool.value.status === "ready") return tool.value.component;
  return markRaw(PlaceholderTool);
});
</script>

<style scoped>
.tool-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.tool-view-header {
  flex: none;
  padding: 20px 28px 16px;
}

.tool-view-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tool-view-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
}

.tool-view-badge {
  flex: none;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  color: var(--accent-aa-text, #ffffff);
  background: var(--accent-aa-fill, #004e8c);
}

.tool-view-desc {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}

.tool-view-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0 28px 28px;
}

.tool-view-missing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 80px 24px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}

.tool-view-missing-link {
  color: var(--accent-base, #0067c0);
  text-decoration: none;
}
</style>
