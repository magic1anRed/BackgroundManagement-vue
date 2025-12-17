import { ref } from "vue";
import { defineStore } from "pinia";
import { ElMessage } from "element-plus";
import router from "@/router";
import axios from "@/util/axios.js";

export const useCurrentUserStore = defineStore('currentUser', () => {

    // 用 ref 更好，能整体覆盖
    const currentUser = ref(null);

    // 设置当前用户
    function setCurrentUser(user) {
        currentUser.value = user;
    }

    // 退出登录
    function logout() {
        axios.post('/logout').then(res => {
            localStorage.removeItem('token');
            currentUser.value = null;
            router.push('/');
        });
    }

    return { currentUser, setCurrentUser, logout };
}, {
    persist: {
        enabled: true, // 开启持久化
        strategies: [
            {
                key: 'currentUser',
                storage: localStorage
            }
        ]
    }
});
