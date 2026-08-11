<template>
  <div class="placeholder-tool">
    <div class="placeholder-tool-icon">
      <span class="placeholder-tool-glyph" aria-hidden="true">{{ tool.icon }}</span>
    </div>
    <h2 class="placeholder-tool-title">{{ tool.title }}</h2>
    <p class="placeholder-tool-desc">{{ tool.description }}</p>

    <div v-if="tool.features?.length" class="placeholder-tool-features">
      <p class="placeholder-tool-feature-label">规划功能</p>
      <ul class="placeholder-tool-feature-list">
        <li v-for="f in tool.features" :key="f" class="placeholder-tool-feature-item">
          <span class="placeholder-tool-feature-dot" aria-hidden="true"></span>
          {{ f }}
        </li>
      </ul>
    </div>

    <p class="placeholder-tool-phase">该工具属于计划第 {{ tool.phase }} 阶段，敬请期待。</p>
  </div>
</template>

<script setup lang="ts">
import type { ToolDef } from "@/tools/registry";

defineProps<{ tool: ToolDef }>();
</script>

<style scoped>
.placeholder-tool {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  min-height: 100%;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
}

.placeholder-tool-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 18px;
  background: var(--card-bg, rgba(255, 255, 255, 0.7));
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 20px;
}

.placeholder-tool-glyph {
  font-family: "WinUIOnWebIcons", "Segoe Fluent Icons", "Segoe MDL2 Assets", sans-serif;
  font-size: 32px;
  line-height: 1;
  color: var(--accent-base, #0067c0);
}

.placeholder-tool-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
  margin: 0 0 6px;
}

.placeholder-tool-desc {
  font-size: 13px;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
  max-width: 480px;
  margin: 0 0 20px;
}

.placeholder-tool-features {
  text-align: left;
  background: var(--card-bg-secondary, rgba(246, 246, 246, 0.5));
  border: 1px solid var(--card-stroke, rgba(0, 0, 0, 0.06));
  border-radius: 8px;
  padding: 14px 18px;
  margin-bottom: 18px;
  max-width: 480px;
  width: 100%;
}

.placeholder-tool-feature-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, rgba(0, 0, 0, 0.62));
  margin: 0 0 8px;
}

.placeholder-tool-feature-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.placeholder-tool-feature-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary, rgba(0, 0, 0, 0.8956));
}

.placeholder-tool-feature-dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-base, #0067c0);
}

.placeholder-tool-phase {
  font-size: 12px;
  color: var(--text-tertiary, rgba(0, 0, 0, 0.4458));
  margin: 0;
}
</style>
