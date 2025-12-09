import { createRouter, createWebHistory } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useCurrentUserStore } from '@/stores/currentUser.js'; // ⚡ 修正：引入 Store
import axios from "@/util/axios.js"; // ⚡ 修正：引入 axios
import { useMenuStore } from "@/stores/menus.js"; // ⚡ 修正：引入 Menu Store

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
        name: 'UserInfo', // ⚡ 修正：添加 name 属性方便后续移除
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
// ⚡ 关键修正 4：状态标志，指示动态路由是否已加载
let hasDynamicRoutesLoaded = false;

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

        // 排除静态配置中已有的 index 路由和 info 路由
        if (finalPath === 'index' || finalPath === 'info') return;

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
    }
  });
  dynamicRouteNames = []; // 清空记录数组
  hasDynamicRoutesLoaded = false; // ⚡ 修正：清除标志
}

/**
  * ⚡ 关键修正 5：集中处理动态路由和菜单的异步加载
 */
async function loadDynamicRoutesAndMenus() {
  if (hasDynamicRoutesLoaded) {
    return true;
  }

  try {
    const userStore = useCurrentUserStore();
    const menuStore = useMenuStore();

    // 1. 获取用户信息 (如果 Pinia 中没有)
    if (!userStore.currentUser || !userStore.currentUser.id) {
      const infoRes = await axios.get('/getInfo');
      userStore.setCurrentUser(infoRes.data);
    }

    if (!userStore.currentUser.id) {
      console.error('无法获取用户ID，终止菜单加载');
      return false;
    }

    // 2. 获取菜单列表
    const res = await axios.get("/perms/getPermsList", {
      params: { userId: userStore.currentUser.id }
    });

    // 3. 修正 path 前缀 (确保 path 完整性)
    const fixMenus = (list) => {
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
          children: item.children ? fixMenus(item.children) : null
        };
      });
    };
    const finalMenus = fixMenus(res.data);

    // 4. 存入 Pinia (用于侧边栏渲染)
    menuStore.setMenus(finalMenus);

    // 5. 动态路由生成和添加
    const asyncRoutes = buildDynamicRoutes(finalMenus);
    addDynamicRoutes(asyncRoutes);

    hasDynamicRoutesLoaded = true;
    return true;

  } catch (error) {
    console.error("动态路由加载失败:", error);
    // 清空 token 并跳转登录页
    const userStore = useCurrentUserStore();
    userStore.logout();
    ElMessage.error("权限或菜单加载失败，请重新登录");
    return false;
  }
}


/* --------------------------------------
                路由守卫
-------------------------------------- */
router.beforeEach(async (to, from, next) => { // ⚠️ 标记为 async
  const token = localStorage.getItem("token");

  // 1. 访问登录页并拥有 token
  if (to.path === '/' && token) {
    // 确保动态路由已加载，否则跳转首页可能失败
    if (!hasDynamicRoutesLoaded) {
      await loadDynamicRoutesAndMenus();
    }
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


  // 4. 已登录且有 token: 检查并加载动态路由
  if (!hasDynamicRoutesLoaded) {
    // 尝试加载动态路由
    const success = await loadDynamicRoutesAndMenus();

    if (success) {
      // ⚡ 关键：加载完成后，使用 `next({ ...to, replace: true })` 重新导航到目标路由
      // 确保新的动态路由生效。
      return next({ path: to.fullPath, replace: true });
    } else {
      // 加载失败，loadDynamicRoutesAndMenus 已处理跳转到登录页
      return next();
    }
  }

  // 5. 动态路由已加载: 正常放行。
  next();
});

export default router;