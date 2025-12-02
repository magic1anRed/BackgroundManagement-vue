    import axios from 'axios'

    // 创建 axios 实例（但名字仍然叫 axios）
    const axiosInstance = axios.create({
        baseURL: 'http://localhost:3030/system', // 你的后端地址
        timeout: 5000
    })

    // 请求拦截器
    axiosInstance.interceptors.request.use(config => {
        const token = localStorage.getItem('token');
        if (token) {
            // 使用后端期望的header名称
            config.headers.magicToken = token; // 或者 'magicToken'
        }
        return config;
    }, error => {
        return Promise.reject(error);
    });

    // 响应拦截器
    axiosInstance.interceptors.response.use(
        response => {
            return response.data
        },
        error => {
            console.error('请求异常:', error)
            return Promise.reject(error)
        }
    )

    // ⭐ 最终导出名字必须叫 axios（你要求的）
    export default axiosInstance
