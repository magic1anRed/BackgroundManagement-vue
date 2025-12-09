import { createRouter, createWebHistory } from 'vue-router';
import { ElMessage } from 'element-plus';

// 1. 静态基础路由（登录页 + /admin 根路由）
const staticRoutes = [
  {
    path: '/',
    component: () => import('@/views/Login.vue'),
  },
  {
    path: '/admin',
    name: 'AdminRoot',
    component: () => import('@/layout/Layout.vue'),
    redirect: '/admin/index',
    children: [
      {
        path: 'index',
        name: 'AdminIndex',
        component: () => import('@/views/IndexView.vue'),
        meta: { title: '首页' }
      },
      {
        path: 'info',
        component: () => import('@/views/UserInfo.vue'),
        meta: { title: '个人中心' }
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // 初始只加载静态路由，404捕获路由将在动态路由加载时添加
  routes: staticRoutes,
});

/* --------------------------------------
   动态导入所有 views 下的组件
-------------------------------------- */
const modules = import.meta.glob('@/views/**/*.vue');

/**
 * 根据后端 component 字段动态加载组件
 * 例如 component: "system/UserView"
 */
function loadView(component) {
  const file = `/src/views/${component}.vue`; // 不需要 @
  // 必须确保组件路径存在，否则加载会失败
  if (modules[file]) {
    return modules[file];
  }
  // 如果找不到组件，返回一个占位组件或 404
  return () => import('@/views/NotFound.vue');
}

// ⚡ 关键修正 1：存储动态路由名称列表，用于注销时清除
let dynamicRouteNames = [];

/**
 * 构建动态路由 (将菜单树转换为路由列表)
 */
export function buildDynamicRoutes(menuList) {
  const routes = [];

  const travel = (menus) => {
    if (!menus) return;

    menus.forEach(menu => {
      // 仅 type = 1 (菜单) 且有 path 和 component 的项才构建路由
      if (menu.type === 1 && menu.path && menu.component) {
        // 路由 path 应该去掉 /admin 前缀，因为它是 AdminRoot 的子路由
        let finalPath = menu.path.startsWith('/admin/') ? menu.path.replace('/admin/', '') : menu.path;
        finalPath = finalPath.startsWith('/') ? finalPath.substring(1) : finalPath;

        // 排除静态配置中已有的 index 路由
        if (finalPath === 'index') return;

        routes.push({
          // path 使用相对路径，例如 'user'
          path: finalPath,
          name: menu.component, // 使用 component 作为 name，确保唯一性
          component: loadView(menu.component),
          meta: {
            title: menu.name,
            icon: menu.icon,
            perms: [menu.identifier] // 注入权限标识
          }
        });
      }

      // 递归处理子菜单
      if (menu.children && menu.children.length > 0) {
        travel(menu.children);
      }
    });
  };

  travel(menuList);
  return routes;
}

/**
 * ⚡ 关键修正 2：添加动态路由并记录名称
 */
export function addDynamicRoutes(dynamicRoutes) {
  dynamicRouteNames = []; // 清空上一次的记录

  dynamicRoutes.forEach(r => {
    if (!router.hasRoute(r.name)) {
      router.addRoute('AdminRoot', r);
      dynamicRouteNames.push(r.name); // 记录名称
    }
  });

  // 关键：添加一个 404 捕获路由作为 AdminRoot 的最后一个子路由
  // 确保当动态路由加载完成后，所有不匹配的路由都会被 AdminLayout 内部的 404 捕获
  if (!router.hasRoute('DynamicNotFound')) {
    router.addRoute('AdminRoot', {
      path: ':pathMatch(.*)*',
      name: 'DynamicNotFound', // 使用一个唯一的名称
      component: () => import('@/views/NotFound.vue'),
      meta: { title: '404' }
    });
    dynamicRouteNames.push('DynamicNotFound');
  }
}

/**
 * ⚡ 关键修正 3：新增清除动态路由的函数
 */
export function clearDynamicRoutes() {
  // 移除所有记录的动态路由
  dynamicRouteNames.forEach(name => {
    if (router.hasRoute(name)) {
      router.removeRoute(name);
      // console.log(`移除动态路由: ${name}`); // 可用于调试
    }
  });
  dynamicRouteNames = []; // 清空记录数组
}

/* --------------------------------------
   路由守卫
-------------------------------------- */
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem("token");

  // 1. 访问登录页并拥有 token → 直接跳首页
  if (to.path === '/' && token) {
    ElMessage.success("欢迎回来~");
    return next({ path: '/admin/index', replace: true });
  }

  // 2. 访问登录页，没有 token → 正常进入登录页
  if (to.path === '/') {
    return next();
  }

  // 3. 访问后台，但没有 token → 跳转登录页
  if (!token) {
    ElMessage.error("请先登录");
    return next({ path: '/', replace: true });
  }

  // 4. 已登录且有 token: 放行。
  // 动态路由的加载和路由重定向（如果需要）将由 Layout.vue 中的 loadMenus 处理。
  next();
});

export default router;