<template>
  <WinToolTipService />
  <div class="app-root">
    <WinTitleBar
      class="app-titlebar"
      Title="WinUI 工具箱"
      PreferredHeightOption="Tall"
      :IsBackButtonVisible="false"
      :IsPaneToggleButtonVisible="true"
      :IconSource="appIcon"
      TitleBarContentHorizontalAlignment="Stretch"
      @PaneToggleRequested="onPaneToggleRequested">
      <template #RightHeader>
        <ThemeButton />
        <WindowControls />
      </template>
    </WinTitleBar>

    <div class="app-content">
      <WinNavigationView
        :MenuItems="navMenuItems"
        :SelectedItem="selectedNavItem"
        :IsPaneOpen="settings.paneOpen"
        PaneDisplayMode="LeftCompact"
        IsBackButtonVisible="Collapsed"
        :IsPaneToggleButtonVisible="false"
        :IsSettingsVisible="true"
        @update:IsPaneOpen="settings.setPaneOpen($event)"
        @ItemInvoked="onItemInvoked">
        <router-view v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <div class="page-view" :key="route.fullPath">
              <component :is="Component" />
            </div>
          </Transition>
        </router-view>
      </WinNavigationView>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSettingsStore } from "@/stores/settings";
import { findToolById, toolModules } from "@/tools/registry";
import WinTitleBar from "@/winui/components/WinTitleBar.vue";
import WinNavigationView from "@/winui/components/WinNavigationView.vue";
import WinToolTipService from "@/winui/components/WinToolTipService.vue";
import ThemeButton from "@/components/ThemeButton.vue";
import WindowControls from "@/components/WindowControls.vue";
import appIcon from "@/winui/assets/AppIcon-512.png";

const settings = useSettingsStore();
const route = useRoute();
const router = useRouter();

const navMenuItems = computed(() =>
  toolModules.map((m) => ({
    Tag: m.id,
    Icon: m.icon,
    Content: m.title,
    SelectsOnInvoked: false,
    MenuItems: m.tools.map((t) => ({
      Tag: t.id,
      Icon: t.icon,
      Content: t.title,
    })),
  }))
);

const selectedNavItem = computed(() => {
  if (route.name === "settings") {
    return { Tag: "settings", Icon: "", Content: "设置" };
  }
  const def = findToolById(String(route.params.id ?? ""));
  if (!def) return null;
  return { Tag: def.id, Icon: def.icon, Content: def.title };
});

function isModuleTag(tag: string | undefined | null): boolean {
  return toolModules.some((m) => m.id === tag);
}

function onItemInvoked(e: {
  IsSettingsInvoked?: boolean;
  InvokedItemContainer?: { Tag?: string | null } | null;
}) {
  if (e.IsSettingsInvoked) {
    void router.push("/settings");
    return;
  }
  const tag = e.InvokedItemContainer?.Tag;
  if (tag && !isModuleTag(tag)) {
    void router.push(`/${tag}`);
  }
}

function onPaneToggleRequested() {
  void settings.setPaneOpen(!settings.paneOpen);
}
</script>

<style scoped>
.app-root {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.app-titlebar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.app-content {
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
  padding-top: 48px;
  display: flex;
  min-width: 0;
  min-height: 0;
}

.app-content :deep(.win-nav-shell) {
  width: 100%;
  height: 100%;
}

.page-view {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.page-enter-active,
.page-leave-active {
  transition: opacity 140ms ease, transform 140ms ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
