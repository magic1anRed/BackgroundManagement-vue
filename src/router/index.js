import { createRouter, createWebHistory } from 'vue-router';
import { ElMessage } from 'element-plus';
import axios from 'axios';
import { useCurrentUserStore } from '@/stores/currentUser.js';
import { useMenuStore } from '@/stores/menus.js';

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
    // 重定向到静态存在的子路由
    redirect: '/admin/info',
    children: [
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
  routes: staticRoutes,
});

/* --------------------------------------
   动态导入所有 views 下的组件
-------------------------------------- */
const modules = import.meta.glob('@/views/**/*.vue');

/**
 * 根据后端 component 字段动态加载组件
 */
function loadView(component) {
  const file = `/src/views/${component}.vue`;
  if (modules[file]) {
    return modules[file];
  }
  return () => import('@/views/NotFound.vue');
}

// ⚡ 全局状态：存储动态路由名称列表，用于注销时清除
let dynamicRouteNames = [];
// ⚡ 关键状态：标记动态路由是否已加载
let hasLoadedDynamicRoutes = false;


/**
 * 构建动态路由 (将菜单树转换为路由列表)
 */
export function buildDynamicRoutes(menuList) {
  const routes = [];

  const travel = (menus) => {
    if (!menus) return;

    menus.forEach(menu => {
      // ⚡ 关键修正 3：允许 type=0 或 type=1 的项作为路由，并确保有 component
      if ((menu.type === 1 || menu.type === 0) && menu.path && menu.component) {
        // 路由 path 应该去掉 /admin 前缀，因为它是 AdminRoot 的子路由
        let finalPath = menu.path.startsWith('/admin/') ? menu.path.replace('/admin/', '') : menu.path;
        finalPath = finalPath.startsWith('/') ? finalPath.substring(1) : finalPath;

        // 由于首页 path 是 /index， finalPath 就是 'index'
        // 如果后端返回的 component 字段是 'IndexView'，则 name 是 'IndexView'

        routes.push({
          path: finalPath,
          name: menu.component,
          component: loadView(menu.component),
          meta: {
            title: menu.name,
            icon: menu.icon,
            perms: [menu.identifier]
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
 * ⚡ 添加动态路由并记录名称
 */
export function addDynamicRoutes(dynamicRoutes) {
  // 确保在添加新的动态路由前清空旧的记录
  dynamicRouteNames = [];

  dynamicRoutes.forEach(r => {
    // 检查 name 是否重复，防止 AdminIndex 和动态注入的 'IndexView' 冲突（虽然我们已移除了静态 AdminIndex）
    if (!router.hasRoute(r.name)) {
      router.addRoute('AdminRoot', r);
      dynamicRouteNames.push(r.name);
    }
  });

  // 关键：添加 404 捕获路由作为 AdminRoot 的最后一个子路由
  if (!router.hasRoute('DynamicNotFound')) {
    router.addRoute('AdminRoot', {
      path: ':pathMatch(.*)*',
      name: 'DynamicNotFound',
      component: () => import('@/views/NotFound.vue'),
      meta: { title: '404' }
    });
    dynamicRouteNames.push('DynamicNotFound');
  }
}

/**
 * ⚡ 新增清除动态路由的函数
 */
export function clearDynamicRoutes() {
  dynamicRouteNames.forEach(name => {
    if (router.hasRoute(name)) {
      router.removeRoute(name);
    }
  });
  dynamicRouteNames = [];
  // 关键：重置加载标记
  hasLoadedDynamicRoutes = false;
}

/**
 * 菜单路径修正工具函数
 */
function fixMenusPath(list) {
  if (!Array.isArray(list)) {
    console.error('fixMenusPath 接收的参数不是数组:', list);
    return [];
  }

  return list.map(item => {
    let newPath = item.path;
    if (newPath) {
      if (!newPath.startsWith('/admin')) {
        if (newPath.startsWith('/')) newPath = '/admin' + newPath;
        else newPath = '/admin/' + newPath;
      }
    }
    return {
      ...item,
      path: newPath,
      children: Array.isArray(item.children) ? fixMenusPath(item.children) : []
    };
  });
}


/* --------------------------------------
   路由守卫 - 解决刷新丢失路由的核心逻辑
-------------------------------------- */
router.beforeEach(async (to, from, next) => {
  const token = localStorage.getItem("token");
  const userStore = useCurrentUserStore();
  const menuStore = useMenuStore();

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

  // 4. 已登录且有 token: 处理动态路由加载
  if (!hasLoadedDynamicRoutes) {
    const BASE_API_URL = 'http://localhost:3030';

    // 4.1. 尝试获取用户信息
    if (!userStore.currentUser || !userStore.currentUser.id) {
      try {
        const res = await axios.get(BASE_API_URL + '/system/getInfo', { headers: { "magicToken": token } });
        if (res.data && res.data.success && res.data.data) {
          userStore.setCurrentUser(res.data.data);
        } else {
          throw new Error(res.data.message || '用户信息获取失败，请重新登录');
        }
      } catch (error) {
        ElMessage.error("用户信息获取失败，请重新登录: " + (error.message || '网络错误'));
        clearDynamicRoutes();
        userStore.logout();
        return next({ path: '/', replace: true });
      }
    }

    // 4.2. 获取菜单并动态加载路由
    try {
      const menuRes = await axios.get(BASE_API_URL + "/system/perms/getPermsList", {
        headers: { "magicToken": token },
        params: { userId: userStore.currentUser.id }
      });

      if (menuRes.data && menuRes.data.success && Array.isArray(menuRes.data.data)) {
        const rawMenus = menuRes.data.data;
        const finalMenus = fixMenusPath(rawMenus);

        menuStore.setMenus(finalMenus);

        const asyncRoutes = buildDynamicRoutes(finalMenus);
        addDynamicRoutes(asyncRoutes);

        hasLoadedDynamicRoutes = true;

        // 🌟 关键步骤：重新跳转到目标路径，确保匹配到新注入的路由
        return next({ path: to.fullPath, replace: true });
      } else {
        throw new Error(menuRes.data.message || '获取菜单数据失败，响应格式错误。');
      }
    } catch (error) {
      ElMessage.error("获取菜单权限失败：" + (error.message || '网络错误'));
      return next({ path: '/', replace: true });
    }
  }

  // 5. 已登录，且动态路由已加载：直接放行
  next();
});

export default router;