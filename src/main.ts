import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { useSettingsStore } from "@/stores/settings";
import { createI18n, i18nKey } from "@/winui/components/i18n/index";
import "@/winui/styles/theme.css";
import "@/styles/app.css";

const app = createApp(App);

app.use(createPinia());
app.use(router);

// WinUIonWeb 组件内部通过 inject(i18nKey) 取文案，跟随系统语言（中文优先）
const i18n = createI18n(navigator.language);
app.provide(i18nKey, i18n);

// 读取持久化设置并应用主题
const settings = useSettingsStore();
void settings.init();

app.mount("#app");
