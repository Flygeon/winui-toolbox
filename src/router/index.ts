import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  // Tauri 生产环境通过自定义协议加载，hash 路由最稳妥
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: "/home" },
    { path: "/home", name: "home", component: () => import("@/views/HomeView.vue") },
    { path: "/settings", name: "settings", component: () => import("@/views/SettingsView.vue") },
    { path: "/:id", name: "tool", component: () => import("@/views/ToolView.vue") },
  ],
});

export default router;
