import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import App from './App.vue'
// ⚡ 修正：引入修正后的 router 实例
import router from './router'
import axios from "@/util/axios.js";
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as Icons from '@element-plus/icons-vue'

// 创建 Pinia 实例并添加持久化插件
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)
window.axios = axios

// 注册所有图标为全局组件
for (const [key, component] of Object.entries(Icons)) {
    app.component(key, component)
}

// 确保按正确顺序使用插件
app.use(pinia)    // 先使用 Pinia
app.use(router)   // 然后使用路由
app.use(ElementPlus)

app.mount('#app')