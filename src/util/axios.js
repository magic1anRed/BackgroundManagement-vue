    import axios from 'axios'
    import {ElMessage} from "element-plus";
    import router from "@/router/index.js";

    // 创建 axios 实例（但名字仍然叫 axios）
    const axiosInstance = axios.create({
        baseURL: 'http://localhost:3030/system', // 你的后端地址
        timeout: 5000
    })

    // 请求拦截器
    axiosInstance.interceptors.request.use(config => {
        const token = localStorage.getItem('token');
        if (token) {
            // 使用后端的名称
            config.headers.magicToken = token;
        }
        return config;
    }, error => {
        return Promise.reject(error);
    });

    // 响应拦截器
    axiosInstance.interceptors.response.use(
        function (response) {
            if (response.data.code === 401){
                localStorage.clear()
                ElMessage.error("请先登录")
                router.push('/')
            }else if (response.data.code !== 200){
                ElMessage.error(response.data.message)
            }else if (response.data.code === 200){
                return response.data
            }
        },
        function (error) {
            ElMessage.error(error.message)
            console.error('请求异常:', error)
            return Promise.reject(error)
        }
    )

    // ⭐ 最终导出名字必须叫 axios（你要求的）
    export default axiosInstance
