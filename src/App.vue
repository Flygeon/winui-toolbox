<template>
  <WinToolTipService />
  <GlobalSearch :open="searchOpen" @close="searchOpen = false" />
  <div class="app-root">
    <WinTitleBar
      class="app-titlebar"
      Title="WinUI 工具箱"
      PreferredHeightOption="Tall"
      :IsBackButtonVisible="false"
      :IsPaneToggleButtonVisible="!settings.sidebarAlwaysExpanded"
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
        :IsPaneOpen="effectivePaneOpen"
        PaneDisplayMode="Left"
        IsBackButtonVisible="Collapsed"
        :IsPaneToggleButtonVisible="false"
        :IsSettingsVisible="true"
        @update:IsPaneOpen="onPaneUpdate"
        @ItemInvoked="onItemInvoked">
        <router-view v-slot="{ Component }">
          <Transition name="page" mode="out-in">
            <KeepAlive>
              <component :is="Component" :key="pageKey" />
            </KeepAlive>
          </Transition>
        </router-view>
      </WinNavigationView>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSettingsStore } from "@/stores/settings";
import { useHistoryStore } from "@/stores/history";
import { findToolById, toolModules } from "@/tools/registry";
import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import WinTitleBar from "@/winui/components/WinTitleBar.vue";
import WinNavigationView from "@/winui/components/WinNavigationView.vue";
import WinToolTipService from "@/winui/components/WinToolTipService.vue";
import ThemeButton from "@/components/ThemeButton.vue";
import WindowControls from "@/components/WindowControls.vue";
import GlobalSearch from "@/components/GlobalSearch.vue";
import { applySystemAccent } from "@/utils/accent";
import appIcon from "@/winui/assets/AppIcon-512.png";

const settings = useSettingsStore();
const history = useHistoryStore();
const route = useRoute();
const router = useRouter();

const searchOpen = ref(false);

const hasTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const HOME_ITEM = { Tag: "home", Icon: "", Content: "主页" };
const SETTINGS_ITEM = { Tag: "settings", Icon: "", Content: "设置" };

/** 按「页面类别」缓存组件：工具区统一缓存为一份，切到主页/设置再回来不丢输入 */
const pageKey = computed(() => (route.name === "tool" ? "tool" : String(route.name ?? "page")));

const navMenuItems = computed(() => [
  HOME_ITEM,
  ...toolModules.map((m) => ({
    Tag: m.id,
    Icon: m.icon,
    Content: m.title,
    SelectsOnInvoked: false,
    MenuItems: m.tools.map((t) => ({
      Tag: t.id,
      Icon: t.icon,
      Content: t.title,
    })),
  })),
]);

const selectedNavItem = computed(() => {
  if (route.name === "home") return HOME_ITEM;
  if (route.name === "settings") return SETTINGS_ITEM;
  const def = findToolById(String(route.params.id ?? ""));
  if (!def) return null;
  return { Tag: def.id, Icon: def.icon, Content: def.title };
});

/** 始终展开侧边栏时，IsPaneOpen 强制为 true */
const effectivePaneOpen = computed(() => (settings.sidebarAlwaysExpanded ? true : settings.paneOpen));

function onPaneUpdate(open: boolean) {
  if (settings.sidebarAlwaysExpanded) {
    void settings.setPaneOpen(true); // 不允许收起
  } else {
    void settings.setPaneOpen(open);
  }
}

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
  if (!tag) return;
  if (tag === "home") {
    void router.push("/home");
  } else if (tag === "settings") {
    void router.push("/settings");
  } else if (!isModuleTag(tag)) {
    void router.push(`/${tag}`);
  }
}

function onPaneToggleRequested() {
  if (settings.sidebarAlwaysExpanded) return;
  void settings.setPaneOpen(!settings.paneOpen);
}

// ---- 窗口记忆（尺寸与位置） ----
let windowUnlisten: (() => void)[] = [];
let boundsTimer: ReturnType<typeof setTimeout> | null = null;

async function persistWindowBounds() {
  if (!hasTauri || !settings.rememberWindow) return;
  try {
    const win = getCurrentWindow();
    if (await win.isMaximized()) return;
    const pos = await win.outerPosition();
    const size = await win.outerSize();
    await settings.saveWindowBounds({ x: pos.x, y: pos.y, width: size.width, height: size.height });
  } catch {
    /* 忽略 */
  }
}

async function restoreWindowBounds() {
  if (!hasTauri || !settings.rememberWindow || !settings.windowBounds) return;
  try {
    const win = getCurrentWindow();
    const b = settings.windowBounds;
    await win.setPosition(new PhysicalPosition(b.x, b.y));
    await win.setSize(new PhysicalSize(b.width, b.height));
  } catch {
    /* 忽略 */
  }
}

async function setupWindowMemory() {
  if (!hasTauri) return;
  try {
    const win = getCurrentWindow();
    await restoreWindowBounds();
    windowUnlisten.push(await win.onResized(() => scheduleBoundsSave()));
    windowUnlisten.push(await win.onMoved(() => scheduleBoundsSave()));
  } catch {
    /* 忽略 */
  }
}

function scheduleBoundsSave() {
  if (!settings.rememberWindow) return;
  if (boundsTimer) clearTimeout(boundsTimer);
  boundsTimer = setTimeout(persistWindowBounds, 400);
}

onMounted(async () => {
  await settings.init();
  void history.init();
  await setupWindowMemory();
  await applySystemAccent();

  window.addEventListener("keydown", onGlobalKeydown);

  // 记住最后使用的工具：设置开启时，启动直接跳到上次的工具
  if (settings.resumeLastTool && history.lastTool && findToolById(history.lastTool)) {
    if (route.name === "home") void router.replace(`/${history.lastTool}`);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onGlobalKeydown);
  windowUnlisten.forEach((fn) => fn());
});

function onGlobalKeydown(e: KeyboardEvent) {
  // Ctrl+K / Ctrl+P 唤起全局搜索
  if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K" || e.key === "p" || e.key === "P")) {
    e.preventDefault();
    searchOpen.value = true;
  }
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
