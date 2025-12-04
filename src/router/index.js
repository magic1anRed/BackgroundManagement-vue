import { createRouter, createWebHistory } from 'vue-router'
import {ElMessage} from "element-plus";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/views/Login.vue'),
    },
    {
      path: '/admin',
      component: () => import('@/layout/Layout.vue'), // 公共布局组件
      redirect: '/admin/index', // 默认子路由
      children: [
        {
          path: 'index',
          name: 'AdminIndex',
          component: () => import('@/views/IndexView.vue'),
        },
        {
          //用户个人信息页面
          path: 'info',
          name: 'UserInfo',
          component: () => import('@/views/UserInfo.vue'),
          meta: { title: '个人中心' }
        },
        {
          //部门管理页面
          path: 'dept',
          name: 'Dept',
          component: () => import('@/views/DeptView.vue'),
          meta: { title: '部门管理' }
        },
        {
          //角色管理页面
          path: 'role',
          name: 'Role',
          component: () => import('@/views/RoleView.vue'),
          meta: { title: '角色管理' }
        },
        {
          //用户管理页面
          path: 'user',
          name: 'User',
          component: () => import('@/views/UsersView.vue'),
          meta: { title: '用户管理' }
        }
      ]
    }
  ],
})

router.beforeEach((to, from, next) => {
  var token = localStorage.getItem("token");
  if (to.path === '/' && token){
    //token存在且访问登录页 强制返回首页
    ElMessage.success("欢迎回来~")
    next({ path: '/admin/index'})
  }else if (to.path === '/'){
    //跳转登录页
    next()
  }else if (!token){
    //token不存在 跳转登录页
    ElMessage.error("请先登录")
    next({ path: '/'})
  }

  next()
})
export default router
