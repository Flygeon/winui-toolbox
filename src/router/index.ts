import { createRouter, createWebHashHistory } from "vue-router";
import { firstToolId } from "@/tools/registry";

const router = createRouter({
  // Tauri 生产环境通过自定义协议加载，hash 路由最稳妥
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: `/${firstToolId}` },
    { path: "/settings", name: "settings", component: () => import("@/views/SettingsView.vue") },
    { path: "/:id", name: "tool", component: () => import("@/views/ToolView.vue") },
  ],
});

export default router;
