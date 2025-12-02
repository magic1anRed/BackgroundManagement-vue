import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('@/views/Login.vue'),
    },
    {
      path: '/admin',
      component: () => import('@/views/Layout.vue'), // 公共布局组件
      redirect: '/admin/index', // 默认子路由
      children: [
        {
          path: 'index',
          name: 'AdminIndex',
          component: () => import('@/views/IndexView.vue'),
        }
      ]
    }
  ],
})

export default router
