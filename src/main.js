import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import axios from "@/util/axios.js";
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as Icons from '@element-plus/icons-vue'

const app = createApp(App)
window.axios = axios

// 关键步骤：循环注册所有图标为全局组件
for (const [key, component] of Object.entries(Icons)) {
    app.component(key, component)
}
app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')
