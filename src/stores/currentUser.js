import {reactive} from "vue";
import {defineStore} from "pinia";
import {ElMessage} from "element-plus";
import router from "@/router/index.js";

export const useCurrentUserStore = defineStore('currentUser', () => {
    // 登录用户信息实体
    let currentUser = reactive({})

    // 设置登录用户信息实体
    function setCurrentUser(currentUser) {
        this.currentUser = currentUser
    }

    function logout() {
        axios.post('/logout').then(res => {
            localStorage.removeItem('token')
            this.currentUser = null
            ElMessage.success('已安全注销')
            router.push('/')
        })
    }
    return { currentUser, setCurrentUser ,logout}
})